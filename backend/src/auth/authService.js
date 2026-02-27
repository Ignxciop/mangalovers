import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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
            if (!existingUser) {
                return {
                    user: {
                        id: existingUser.id,
                        email: existingUser.email,
                        name: existingUser.name,
                        lastname: existingUser.lastname,
                    },
                };
            }

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

        return {
            user,
            accessToken,
            refreshToken: refreshToken.token,
        };
    }

    static async login(credentials, deviceInfo = null, ipAddress = null) {
        const { email, password } = credentials;

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
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

        return {
            user: userWithoutPassword,
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
        const { name, lastname, email } = data;

        if (email) {
            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing && existing.id !== userId) {
                const error = new Error("El email ya está en uso");
                error.statusCode = 409;
                throw error;
            }
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(name && { name }),
                ...(lastname && { lastname }),
                ...(email && { email }),
            },
            select: {
                id: true,
                email: true,
                name: true,
                lastname: true,
            },
        });

        return user;
    }

    static async updatePassword(userId, { currentPassword, newPassword }) {
        const user = await prisma.user.findUnique({ where: { id: userId } });

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
    }

    static async deleteAccount(userId, { password }) {
        const user = await prisma.user.findUnique({ where: { id: userId } });

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            const error = new Error("Contraseña incorrecta");
            error.statusCode = 400;
            throw error;
        }

        await prisma.user.delete({ where: { id: userId } });
    }
}
