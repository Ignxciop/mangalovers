import { prisma } from "../config/prisma.js";
import logger from "../config/logger.js";

export class AdminAuditService {
  static async log(adminId, action, { targetId = null, targetType = null, metadata = null } = {}) {
    try {
      const result = await prisma.adminAuditLog.create({
        data: { adminId, action, targetId, targetType, metadata },
      });
      logger.info({ adminId, action, auditId: result.id }, "AdminAudit: evento guardado");
      return result;
    } catch (error) {
      logger.error({ err: error.message, adminId, action }, "AdminAudit: error al guardar");
    }
  }

  static async getLogs(page = 1, limit = 20, filters = {}) {
    const skip = (page - 1) * limit;
    const where = {};

    if (filters.adminId) where.adminId = filters.adminId;
    if (filters.action) where.action = filters.action;
    if (filters.targetType) where.targetType = filters.targetType;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const [data, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          admin: {
            select: { id: true, name: true, lastname: true, email: true },
          },
        },
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
