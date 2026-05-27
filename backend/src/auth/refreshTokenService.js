import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { config } from "../config/env.js";
import { UnauthorizedError } from "../utils/errors.js";

export class RefreshTokenService {
  static generateRefreshToken() {
    return crypto.randomBytes(64).toString("hex");
  }

  static async createRefreshToken(userId) {
    const token = this.generateRefreshToken();
    const expiresAt = new Date();
    const daysToExpire = parseInt(config.JWT_REFRESH_EXPIRES_IN.replace("d", ""));
    expiresAt.setDate(expiresAt.getDate() + daysToExpire);

    return prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });
  }

  static async validateRefreshToken(token) {
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: {
            user: {
                select: {
                  id: true, email: true, name: true, lastname: true, role: true,
                  status: true, suspendedUntil: true,
                  password: true, createdAt: true, updatedAt: true,
                },
            },
      },
    });

    if (!refreshToken) throw new UnauthorizedError("Refresh token inválido");

    if (new Date() > refreshToken.expiresAt) {
      await this.revokeRefreshToken(token);
      throw new UnauthorizedError("Refresh token expirado");
    }

    if (refreshToken.isRevoked) {
      throw new UnauthorizedError("Refresh token revocado");
    }

    return refreshToken;
  }

  static async revokeRefreshToken(token, replacedBy = null) {
    await prisma.refreshToken.update({
      where: { token },
      data: { isRevoked: true, replacedBy },
    });
  }

  static async cleanExpiredTokens() {
    await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }

  static async revokeAllUserTokens(userId) {
    await prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  static async getUserActiveTokens(userId) {
    return prisma.refreshToken.findMany({
      where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, expiresAt: true },
    });
  }
}
