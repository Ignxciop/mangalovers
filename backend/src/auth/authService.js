import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../config/prisma.js";
import { config } from "../config/env.js";
import { RefreshTokenService } from "./refreshTokenService.js";
import { validateEmail } from "../config/emailAllowed.js";

export class AuthService {
    static generateAccessToken(userId) {
        return jwt.sign({ userId }, config.JWT_SECRET, {
            expiresIn: config.JWT_EXPIRES_IN,
        });
    }

    static async register(userData) {
        const { email, password, name, lastname } = userData;

        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            const error = new Error(emailValidation.reason);
            error.statusCode = 400;
            throw error;
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            const error = new Error("El usuario ya existe.");
            error.statusCode = 409;
            throw error;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                lastname: lastname,
            },
            select: {
                id: true,
                email: true,
                name: true,
                lastname: true,
                createdAt: true,
            },
        });

        const accessToken = this.generateAccessToken(user.id);
        const refreshToken = await RefreshTokenService.createRefreshToken(
            user.id,
        );

        console.log({
            event: "REGISTER",
            userId: user.id,
            email: user.email,
            timestamp: new Date().toISOString(),
        });

        return {
            user,
            accessToken,
            refreshToken: refreshToken.token,
        };
    }

    static async login(credentials) {
        const { email, password } = credentials;

        const user = await prisma.user.findUnique({
            where: { email },
        });

        const dummyHash = "$2b$10$0000000000000000000000000000000000000000000";

        if (!user) {
            await bcrypt.compare(password, dummyHash);
            const error = new Error("Credenciales inválidas");
            error.statusCode = 401;
            throw error;
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            const error = new Error("Credenciales inválidas");
            error.statusCode = 401;
            throw error;
        }

        const accessToken = this.generateAccessToken(user.id);
        const refreshToken = await RefreshTokenService.createRefreshToken(
            user.id,
        );

        const { password: _, ...userWithoutPassword } = user;

        console.log({
            event: "LOGIN",
            userId: user.id,
            email: user.email,
            timestamp: new Date().toISOString(),
        });

        return {
            user: userWithoutPassword,
            accessToken,
            refreshToken: refreshToken.token,
        };
    }

    static async googleLogin(idToken) {
        const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

        const ticket = await client.verifyIdToken({
            idToken,
            audience: config.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, given_name, family_name } = payload;

        if (!email) {
            const error = new Error("Email requerido de Google");
            error.statusCode = 400;
            throw error;
        }

        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            const error = new Error(emailValidation.reason);
            error.statusCode = 400;
            throw error;
        }

        let user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    name: given_name || "Usuario",
                    lastname: family_name || "",
                    password: "",
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    lastname: true,
                    createdAt: true,
                },
            });
        }

        const accessToken = this.generateAccessToken(user.id);
        const refreshToken = await RefreshTokenService.createRefreshToken(
            user.id,
        );

        console.log({
            event: "GOOGLE_LOGIN",
            userId: user.id,
            email: user.email,
            timestamp: new Date().toISOString(),
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                lastname: user.lastname,
            },
            accessToken,
            refreshToken: refreshToken.token,
        };
    }

    static async refreshAccessToken(refreshTokenString) {
        const refreshToken =
            await RefreshTokenService.validateRefreshToken(refreshTokenString);

        const accessToken = this.generateAccessToken(refreshToken.userId);

        const newRefreshToken = await RefreshTokenService.createRefreshToken(
            refreshToken.userId,
        );

        await RefreshTokenService.revokeRefreshToken(
            refreshTokenString,
            newRefreshToken.token,
        );

        const { password: _, ...userWithoutPassword } = refreshToken.user;

        return {
            user: userWithoutPassword,
            accessToken,
            refreshToken: newRefreshToken.token,
        };
    }

    static async logout(refreshTokenString) {
        if (refreshTokenString) {
            await RefreshTokenService.revokeRefreshToken(refreshTokenString);
        }
        return { message: "Logout exitoso" };
    }

    static async logoutAll(userId) {
        await RefreshTokenService.revokeAllUserTokens(userId);
        return { message: "Se han cerrado todas las sesiones" };
    }

    static async getMe(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                lastname: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            const error = new Error("Usuario no encontrado");
            error.statusCode = 404;
            throw error;
        }

        return user;
    }

    static async getActiveSessions(userId) {
        return await RefreshTokenService.getUserActiveTokens(userId);
    }

    static async updateProfile(userId, data) {
        const ALLOWED_FIELDS = ["name", "lastname", "email"];
        const updateData = {};

        for (const field of ALLOWED_FIELDS) {
            if (data[field] !== undefined) {
                updateData[field] = data[field];
            }
        }

        if (updateData.email) {
            const existing = await prisma.user.findUnique({ where: { email: updateData.email } });
            if (existing && existing.id !== userId) {
                const error = new Error("El email ya está en uso");
                error.statusCode = 409;
                throw error;
            }
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                lastname: true,
            },
        });

        console.log({
            event: "UPDATE_PROFILE",
            userId,
            changes: Object.keys(updateData),
            timestamp: new Date().toISOString(),
        });

        return user;
    }

    static async updatePassword(userId, { currentPassword, newPassword }) {
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user.password) {
            const error = new Error("Las cuentas vinculadas a Google no pueden cambiar contraseña");
            error.statusCode = 400;
            throw error;
        }

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            const error = new Error("Contraseña actual incorrecta");
            error.statusCode = 400;
            throw error;
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashed },
        });

        await RefreshTokenService.revokeAllUserTokens(userId);

        console.log({
            event: "UPDATE_PASSWORD",
            userId,
            timestamp: new Date().toISOString(),
        });
    }

    static async deleteAccount(userId, { password }) {
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user.password) {
            const error = new Error("Las cuentas vinculadas a Google no pueden eliminarse con contraseña");
            error.statusCode = 400;
            throw error;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            const error = new Error("Contraseña incorrecta");
            error.statusCode = 400;
            throw error;
        }

        console.log({
            event: "DELETE_ACCOUNT",
            userId,
            email: user.email,
            timestamp: new Date().toISOString(),
        });

        await prisma.user.delete({ where: { id: userId } });
    }
}
