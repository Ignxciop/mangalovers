import { prisma } from "../config/prisma.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { RefreshTokenService } from "../auth/refreshTokenService.js";

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
      },
    });
  }

  static async updateStatus(targetUserId, status, adminUserId, suspendedUntil) {
    if (targetUserId === adminUserId) {
      throw new ValidationError("No puedes cambiar tu propio estado");
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundError("Usuario no encontrado");

    const data = { status };
    if (status === "SUSPENDED" && suspendedUntil) {
      data.suspendedUntil = new Date(suspendedUntil);
    } else if (status !== "SUSPENDED") {
      data.suspendedUntil = null;
    }

    if (status === "BANNED" || status === "SUSPENDED") {
      await RefreshTokenService.revokeAllUserTokens(targetUserId);
    }

    return prisma.user.update({
      where: { id: targetUserId },
      data,
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
      },
    });
  }
}
