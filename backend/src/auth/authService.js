import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../config/prisma.js";
import { config } from "../config/env.js";
import logger from "../config/logger.js";
import { RefreshTokenService } from "./refreshTokenService.js";
import { validateEmail } from "../config/emailAllowed.js";
import { ConflictError, UnauthorizedError, NotFoundError, ValidationError } from "../utils/errors.js";

export class AuthService {
  static generateAccessToken(user) {
    return jwt.sign({ userId: user.id, role: user.role }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });
  }

  static async register(userData) {
    const { email, password, name, lastname } = userData;

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      throw new ValidationError(emailValidation.reason);
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError("El usuario ya existe.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, lastname },
      select: { id: true, email: true, name: true, lastname: true, role: true, status: true, createdAt: true },
    });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await RefreshTokenService.createRefreshToken(user.id);

    logger.info({ event: "REGISTER", userId: user.id, email: user.email }, "Usuario registrado");

    return { user, accessToken, refreshToken: refreshToken.token };
  }

  static async login(credentials) {
    const { email, password } = credentials;

    const user = await prisma.user.findUnique({ where: { email } });

    const dummyHash = bcrypt.hashSync("dummy_timing_attack", 10);
    const passwordToCheck = user ? user.password : dummyHash;
    const isValidPassword = await bcrypt.compare(password, passwordToCheck);

    if (!user || !isValidPassword) {
      throw new UnauthorizedError("Credenciales inválidas");
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    user.lastLoginAt = new Date();

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await RefreshTokenService.createRefreshToken(user.id);

    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;

    logger.info({ event: "LOGIN", userId: user.id, email: user.email }, "Inicio de sesión");

    return { user: userWithoutPassword, accessToken, refreshToken: refreshToken.token };
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
      throw new ValidationError("Email requerido de Google");
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      throw new ValidationError(emailValidation.reason);
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: given_name || "Usuario",
          lastname: family_name || "",
          password: "",
        },
        select: { id: true, email: true, name: true, lastname: true, role: true, status: true, createdAt: true },
      });
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await RefreshTokenService.createRefreshToken(user.id);

    logger.info({ event: "GOOGLE_LOGIN", userId: user.id, email: user.email }, "Login con Google");

    return {
      user: { id: user.id, email: user.email, name: user.name, lastname: user.lastname, role: user.role },
      accessToken,
      refreshToken: refreshToken.token,
    };
  }

  static async refreshAccessToken(refreshTokenString) {
    if (!refreshTokenString) {
      throw new UnauthorizedError("Refresh token requerido");
    }

    const refreshToken = await RefreshTokenService.validateRefreshToken(refreshTokenString);

    const accessToken = this.generateAccessToken(refreshToken.user);
    const newRefreshTokenToken = RefreshTokenService.generateRefreshToken();
    const daysToExpire = parseInt(config.JWT_REFRESH_EXPIRES_IN.replace("d", ""));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysToExpire);

    await prisma.$transaction(async (_tx) => {
      await prisma.refreshToken.create({
        data: { token: newRefreshTokenToken, userId: refreshToken.userId, expiresAt },
      });
      await RefreshTokenService.revokeRefreshToken(refreshTokenString, newRefreshTokenToken);
    });

    const userWithoutPassword = { ...refreshToken.user };
    delete userWithoutPassword.password;

    return { user: userWithoutPassword, accessToken, refreshToken: newRefreshTokenToken };
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
      select: { id: true, email: true, name: true, lastname: true, role: true, createdAt: true, updatedAt: true },
    });

    if (!user) throw new NotFoundError("Usuario no encontrado");

    return user;
  }

  static async getActiveSessions(userId) {
    return RefreshTokenService.getUserActiveTokens(userId);
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
        throw new ConflictError("El email ya está en uso");
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, name: true, lastname: true, role: true },
    });

    logger.info({ event: "UPDATE_PROFILE", userId, changes: Object.keys(updateData) }, "Perfil actualizado");

    return user;
  }

  static async updatePassword(userId, { currentPassword, newPassword }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user.password) {
      throw new ValidationError("Las cuentas vinculadas a Google no pueden cambiar contraseña");
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new ValidationError("Contraseña actual incorrecta");
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { password: hashed } });
      await RefreshTokenService.revokeAllUserTokens(userId);
    });

    logger.info({ event: "UPDATE_PASSWORD", userId }, "Contraseña actualizada");
  }

  static async deleteAccount(userId, { password }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user.password) {
      throw new ValidationError("Las cuentas vinculadas a Google no pueden eliminarse con contraseña");
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new ValidationError("Contraseña incorrecta");
    }

    logger.info({ event: "DELETE_ACCOUNT", userId, email: user.email }, "Cuenta eliminada");
    await prisma.user.delete({ where: { id: userId } });
  }
}
