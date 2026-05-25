import { prisma } from "../config/prisma.js";

const VALID_EVENTS = new Set([
  "LOGIN", "LOGOUT", "REGISTER",
  "ADD_FAVORITE", "REMOVE_FAVORITE",
  "MARK_READ",
  "SEND_SUGGESTION", "UPDATE_SUGGESTION_STATUS",
  "UPDATE_ROLE", "UPDATE_USER_STATUS",
  "RATE_LIMIT", "API_ERROR",
]);

export class ActivityLogService {
  static async logEvent(userId, event, metadata = null, ip = null, userAgent = null) {
    if (!VALID_EVENTS.has(event)) {
      throw new Error(`Invalid activity event: ${event}`);
    }

    return prisma.userActivity.create({
      data: { userId, event, metadata, ip, userAgent },
    });
  }

  static async getUserLogs(userId, page = 1, limit = 20, filters = {}) {
    const skip = (page - 1) * limit;
    const where = { userId };

    if (filters.event) {
      where.event = filters.event;
    }
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const [data, total] = await Promise.all([
      prisma.userActivity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.userActivity.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  static async getAllLogs(page = 1, limit = 20, filters = {}) {
    const skip = (page - 1) * limit;
    const where = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.event) where.event = filters.event;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const [data, total] = await Promise.all([
      prisma.userActivity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, lastname: true, email: true },
          },
        },
      }),
      prisma.userActivity.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  static async cleanupOld(days = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const { count } = await prisma.userActivity.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    return count;
  }
}
