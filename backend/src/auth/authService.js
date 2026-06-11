import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../config/prisma.js";
import { config } from "../config/env.js";
import logger from "../config/logger.js";
import { removeAvatar } from "../middlewares/uploadAvatar.js";
import { RefreshTokenService } from "./refreshTokenService.js";
import { validateEmail } from "../config/emailAllowed.js";
import { ConflictError, UnauthorizedError, NotFoundError, ValidationError, ForbiddenError } from "../utils/errors.js";

function formatSuspendedUntil(date) {
  return new Date(date).toLocaleString("es-ES", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

async function checkUserStatus(user) {
  if (user.status === "BANNED") {
    throw new ForbiddenError("Tu cuenta ha sido baneada");
  }
  if (user.status === "SUSPENDED") {
    if (!user.suspendedUntil || new Date(user.suspendedUntil) <= new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { status: "ACTIVE", suspendedUntil: null },
      });
    } else {
      throw new ForbiddenError(
        `Tu cuenta está suspendida hasta el ${formatSuspendedUntil(user.suspendedUntil)}`,
      );
    }
  }
}

function generateAlias(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15) || "user";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}_${suffix}`;
}

export class AuthService {
  static generateAccessToken(user) {
    return jwt.sign({ userId: user.id, role: user.role }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });
  }

  static async register(userData) {
    const { email, password, name, lastname, alias } = userData;

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      throw new ValidationError(emailValidation.reason);
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError("El usuario ya existe.");
    }

    if (alias) {
      const existingAlias = await prisma.user.findUnique({ where: { alias } });
      if (existingAlias) {
        throw new ConflictError("El alias ya está en uso.");
      }
    }

    const finalAlias = alias || generateAlias(name);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, lastname, alias: finalAlias, aliasChanged: !!alias },
      select: { id: true, email: true, name: true, lastname: true, alias: true, aliasChanged: true, role: true, status: true, avatarUrl: true, createdAt: true },
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

    await checkUserStatus(user);

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    user.lastLoginAt = new Date();

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await RefreshTokenService.createRefreshToken(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

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
      const alias = generateAlias(given_name || "user");
      user = await prisma.user.create({
        data: {
          email,
          name: given_name || "Usuario",
          lastname: family_name || "",
          password: "",
          alias,
        },
        select: { id: true, email: true, name: true, lastname: true, alias: true, aliasChanged: true, role: true, status: true, avatarUrl: true, suspendedUntil: true, createdAt: true },
      });
    } else {
      await checkUserStatus(user);
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await RefreshTokenService.createRefreshToken(user.id);

    logger.info({ event: "GOOGLE_LOGIN", userId: user.id, email: user.email }, "Login con Google");

    return {
      user: { id: user.id, email: user.email, name: user.name, lastname: user.lastname, alias: user.alias, aliasChanged: user.aliasChanged, role: user.role, avatarUrl: user.avatarUrl },
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
      select: { id: true, email: true, name: true, lastname: true, alias: true, aliasChanged: true, role: true, avatarUrl: true, profileVisibility: true, hideOnline: true, createdAt: true, updatedAt: true },
    });

    if (!user) throw new NotFoundError("Usuario no encontrado");

    return user;
  }

  static async getMyStatus(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, suspendedUntil: true },
    });

    if (!user) throw new NotFoundError("Usuario no encontrado");

    return user;
  }

  static async getActiveSessions(userId) {
    return RefreshTokenService.getUserActiveTokens(userId);
  }

  static async updateProfile(userId, data) {
    const ALLOWED_FIELDS = ["name", "lastname", "email", "profileVisibility", "hideOnline"];
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
      select: { id: true, email: true, name: true, lastname: true, alias: true, aliasChanged: true, role: true, avatarUrl: true, profileVisibility: true, hideOnline: true },
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

  static async updateAvatar(userId, filename) {
    const old = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (old?.avatarUrl) {
      removeAvatar(old.avatarUrl);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: filename },
      select: { id: true, email: true, name: true, lastname: true, alias: true, aliasChanged: true, role: true, avatarUrl: true },
    });

    logger.info({ event: "UPDATE_AVATAR", userId }, "Avatar actualizado");

    return user;
  }

  static async updateAlias(userId, alias) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { aliasChanged: true },
    });

    if (user.aliasChanged) {
      throw new ValidationError("Ya has cambiado tu alias anteriormente. Solo puedes hacerlo una vez.");
    }

    const existingAlias = await prisma.user.findUnique({ where: { alias } });
    if (existingAlias) {
      throw new ConflictError("El alias ya está en uso.");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { alias, aliasChanged: true },
      select: { id: true, email: true, name: true, lastname: true, alias: true, aliasChanged: true, role: true, avatarUrl: true },
    });

    logger.info({ event: "UPDATE_ALIAS", userId, alias }, "Alias actualizado");

    return updated;
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
