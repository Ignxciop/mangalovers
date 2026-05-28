import { prisma } from "../config/prisma.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { RefreshTokenService } from "../auth/refreshTokenService.js";
import logger from "../config/logger.js";

export class AdminUserService {
  static async listUsers(page = 1, limit = 20, filters = {}) {
    const skip = (page - 1) * limit;
    const where = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { lastname: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          lastname: true,
          role: true,
          status: true,
          suspendedUntil: true,
          lastLoginAt: true,
          createdAt: true,
          avatarUrl: true,
          _count: {
            select: {
              suggestions: true,
              favorites: true,
              chapterReads: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  static async updateRole(targetUserId, newRole, adminUserId) {
    if (targetUserId === adminUserId) {
      throw new ValidationError("No puedes cambiar tu propio rol");
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundError("Usuario no encontrado");

    return prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        name: true,
        lastname: true,
        role: true,
        status: true,
        suspendedUntil: true,
        lastLoginAt: true,
        createdAt: true,
        avatarUrl: true,
      },
    });
  }

  static async getUserBasicInfo(id) {
    return prisma.user.findUnique({
      where: { id },
      select: { name: true, lastname: true, role: true, status: true },
    });
  }

  static async updateStatus(targetUserId, status, suspendedUntil, adminUserId) {
    if (targetUserId === adminUserId) {
      throw new ValidationError("No puedes cambiar tu propio estado");
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundError("Usuario no encontrado");

    const updateData = { status };
    if (status === "SUSPENDED" && suspendedUntil) {
      updateData.suspendedUntil = new Date(suspendedUntil);
    } else if (status !== "SUSPENDED") {
      updateData.suspendedUntil = null;
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        lastname: true,
        role: true,
        status: true,
        suspendedUntil: true,
        lastLoginAt: true,
        createdAt: true,
        avatarUrl: true,
      },
    });

    if (status === "BANNED" || status === "SUSPENDED") {
      RefreshTokenService.revokeAllUserTokens(targetUserId).catch((err) =>
        logger.warn({ err, targetUserId }, "Error revocando tokens al cambiar estado"),
      );
    }

    return updated;
  }

  static async getStatusHistory(userId) {
    try {
      const logs = await prisma.userActivity.findMany({
        where: {
          event: "UPDATE_USER_STATUS",
          metadata: { path: ["targetUserId"], equals: userId },
        },
        orderBy: { createdAt: "desc" },
        select: { metadata: true, createdAt: true },
      });

      const suspensions = logs.filter((l) => l.metadata?.newStatus === "SUSPENDED");
      const bans = logs.filter((l) => l.metadata?.newStatus === "BANNED");

      return {
        suspensionCount: suspensions.length,
        lastSuspension: suspensions[0]?.createdAt ?? null,
        banCount: bans.length,
        lastBan: bans[0]?.createdAt ?? null,
      };
    } catch (error) {
      logger.warn({ err: error, userId }, "Error fetching status history");
      return { suspensionCount: 0, lastSuspension: null, banCount: 0, lastBan: null };
    }
  }
}
