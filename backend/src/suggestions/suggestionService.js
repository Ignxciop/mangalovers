import { prisma } from "../config/prisma.js";
import { NotFoundError } from "../utils/errors.js";
import logger from "../config/logger.js";
import { createNotification } from "../notifications/notificationService.js";

export class SuggestionService {
  static async create(userId, { type, title, description, image }) {
    return prisma.suggestion.create({
      data: { userId, type, title, description, image },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        image: true,
        status: true,
        createdAt: true,
      },
    });
  }

  static async getUserSuggestions(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.suggestion.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          image: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.suggestion.count({ where: { userId } }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  static async getAll(page = 1, limit = 20, filters = {}) {
    const skip = (page - 1) * limit;
    const where = {};

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { user: { name: { contains: filters.search, mode: "insensitive" } } },
        { user: { lastname: { contains: filters.search, mode: "insensitive" } } },
        { user: { email: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    const STATUSES = ["OPEN", "REVIEWING", "RESOLVED", "REJECTED", "CLOSED"];

    const countWhere = { ...where };
    delete countWhere.status;

    const [data, total, ...countsArr] = await Promise.all([
      prisma.suggestion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          image: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
          reviewedById: true,
          user: {
            select: { name: true, lastname: true, email: true },
          },
          reviewedBy: {
            select: { name: true, lastname: true, email: true },
          },
        },
      }),
      prisma.suggestion.count({ where }),
      ...STATUSES.map((s) => prisma.suggestion.count({ where: { ...countWhere, status: s } })),
    ]);

    const counts = { total: 0 };
    STATUSES.forEach((s, i) => {
      counts[s] = countsArr[i];
      counts.total += countsArr[i];
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), counts },
    };
  }

  static async getById(id) {
    return prisma.suggestion.findUnique({
      where: { id },
      select: { id: true, title: true, status: true },
    });
  }

  static async updateStatus(suggestionId, status, adminUserId) {
    const suggestion = await prisma.suggestion.findUnique({ where: { id: suggestionId } });
    if (!suggestion) throw new NotFoundError("Sugerencia no encontrada");

    const updated = await prisma.suggestion.update({
      where: { id: suggestionId },
      data: { status, reviewedById: adminUserId },
      select: {
        id: true,
        type: true,
        title: true,
        status: true,
        updatedAt: true,
        reviewedById: true,
        reviewedBy: {
          select: { name: true, lastname: true },
        },
      },
    });

    if (status === "RESOLVED" || status === "REJECTED") {
      const label = status === "RESOLVED" ? "resuelta" : "rechazada";
      createNotification({
        userId: suggestion.userId,
        type: "SUGGESTION_RESOLVED",
        title: `Sugerencia ${label}`,
        body: `Tu sugerencia "${suggestion.title}" fue ${label}`,
        data: { suggestionId, status, reviewedBy: adminUserId },
      }).catch((err) => logger.warn({ err }, "Error creando notificación"));
    }

    return updated;
  }
}
