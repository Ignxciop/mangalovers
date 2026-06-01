import { prisma } from "../config/prisma.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";

export class AdminAnnouncementService {
  static async list(page = 1, limit = 20, filters = {}) {
    const skip = (page - 1) * limit;
    const where = {};

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    if (filters.active !== undefined) {
      where.active = filters.active === "true" || filters.active === true;
    }

    const [data, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          _count: { select: { seenBy: true } },
        },
      }),
      prisma.announcement.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  static async getById(id) {
    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: {
        _count: { select: { seenBy: true } },
      },
    });
    if (!announcement) throw new NotFoundError("Anuncio no encontrado");
    return announcement;
  }

  static async create(data) {
    if (!data.title?.trim()) throw new ValidationError("El título es obligatorio");
    if (!data.body?.trim()) throw new ValidationError("El cuerpo es obligatorio");

    const publishAt = data.publishAt ? new Date(data.publishAt) : new Date();
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (expiresAt <= publishAt) {
      throw new ValidationError("La fecha de expiración debe ser posterior a la de publicación");
    }

    return prisma.announcement.create({
      data: {
        title: data.title.trim(),
        body: data.body.trim(),
        active: data.active ?? true,
        publishAt,
        expiresAt,
      },
    });
  }

  static async update(id, data) {
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Anuncio no encontrado");

    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.body !== undefined) updateData.body = data.body.trim();
    if (data.active !== undefined) updateData.active = data.active;
    if (data.publishAt !== undefined) updateData.publishAt = new Date(data.publishAt);
    if (data.expiresAt !== undefined) updateData.expiresAt = new Date(data.expiresAt);

    const publishAt = updateData.publishAt || existing.publishAt;
    const expiresAt = updateData.expiresAt || existing.expiresAt;
    if (expiresAt <= publishAt) {
      throw new ValidationError("La fecha de expiración debe ser posterior a la de publicación");
    }

    return prisma.announcement.update({
      where: { id },
      data: updateData,
    });
  }

  static async delete(id) {
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Anuncio no encontrado");

    await prisma.userAnnouncement.deleteMany({ where: { announcementId: id } });
    await prisma.announcement.delete({ where: { id } });
  }
}
