import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { config } from "../config/env.js";

export class RefreshTokenService {
    static generateRefreshToken() {
        return crypto.randomBytes(64).toString("hex");
    }

    static async createRefreshToken(userId) {
        const token = this.generateRefreshToken();
        const expiresAt = new Date();
        const daysToExpire = parseInt(
            config.JWT_REFRESH_EXPIRES_IN.replace("d", ""),
        );
        expiresAt.setDate(expiresAt.getDate() + daysToExpire);

        const refreshToken = await prisma.refreshToken.create({
            data: {
                token,
                userId,
                expiresAt,
            },
        });

        return refreshToken;
    }

    static async validateRefreshToken(token) {
        const refreshToken = await prisma.refreshToken.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!refreshToken) {
            const error = new Error("Refresh token inválido");
            error.statusCode = 401;
            throw error;
        }

        if (new Date() > refreshToken.expiresAt) {
            await this.revokeRefreshToken(token);
            const error = new Error("Refresh token expirado");
            error.statusCode = 401;
            throw error;
        }

        if (refreshToken.isRevoked) {
            if (refreshToken.replacedBy) {
                const replacementToken = await prisma.refreshToken.findUnique({
                    where: { token: refreshToken.replacedBy },
                    include: { user: true },
                });

                if (
                    replacementToken &&
                    !replacementToken.isRevoked &&
                    new Date() <= replacementToken.expiresAt
                ) {
                    return replacementToken;
                }
            }

            await this.revokeTokenFamily(token);
            const error = new Error(
                "Refresh token revocado. Por seguridad, se han revocado todos tus tokens.",
            );
            error.statusCode = 401;
            throw error;
        }

        return refreshToken;
    }

    static async revokeRefreshToken(token, replacedBy = null) {
        await prisma.refreshToken.update({
            where: { token },
            data: {
                isRevoked: true,
                replacedBy,
            },
        });
    }

    static async revokeTokenFamily(token) {
        const currentToken = await prisma.refreshToken.findUnique({
            where: { token },
        });

        if (!currentToken) return;

        await this.revokeRefreshToken(token);

        await prisma.refreshToken.updateMany({
            where: {
                userId: currentToken.userId,
                createdAt: {
                    gte: currentToken.createdAt,
                },
                isRevoked: false,
            },
            data: {
                isRevoked: true,
            },
        });
    }

    static async cleanExpiredTokens() {
        await prisma.refreshToken.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
    }

    static async revokeAllUserTokens(userId) {
        await prisma.refreshToken.updateMany({
            where: {
                userId,
                isRevoked: false,
            },
            data: {
                isRevoked: true,
            },
        });
    }

    static async getUserActiveTokens(userId) {
        return await prisma.refreshToken.findMany({
            where: {
                userId,
                isRevoked: false,
                expiresAt: {
                    gt: new Date(),
                },
            },
            select: {
                id: true,
                createdAt: true,
                expiresAt: true,
            },
        });
    }
}
