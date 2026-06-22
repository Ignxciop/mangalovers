import { prisma } from "../config/prisma.js";
import logger from "../config/logger.js";
import { mergeSeries } from "../manga/scrapers/duplicateSeries.js";
import { updateSeriesMetadata } from "../manga/scrapers/updateSeriesMetadata.js";

const CHAPTERS_PER_PAGE = 20;

export class AdminSeriesService {
  static async listSeries({ page = 1, limit = 20, search, provider }) {
    const where = {};

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (provider) {
      where.providerSeries = {
        some: { provider: { name: provider } },
      };
    }

    const [total, series] = await Promise.all([
      prisma.series.count({ where }),
      prisma.series.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          providerSeries: {
            include: { provider: { select: { name: true, priority: true } } },
          },
          primaryRelations: {
            include: {
              fallbackSeries: { select: { id: true, name: true, slug: true } },
            },
          },
          fallbackRelations: {
            include: {
              primarySeries: { select: { id: true, name: true, slug: true } },
            },
          },
          _count: { select: { chapters: true } },
        },
      }),
    ]);

    return { total, page, limit, data: series };
  }

  static async getSeries(id) {
    const series = await prisma.series.findUnique({
      where: { id },
      include: {
        providerSeries: {
          include: { provider: { select: { name: true, priority: true } } },
        },
        primaryRelations: {
          include: {
            fallbackSeries: {
              select: { id: true, name: true, slug: true, cover: true },
            },
          },
        },
        fallbackRelations: {
          include: {
            primarySeries: {
              select: { id: true, name: true, slug: true, cover: true },
            },
          },
        },
        aliases: true,
        _count: { select: { chapters: true } },
      },
    });

    if (!series) {
      const error = new Error("Serie no encontrada");
      error.statusCode = 404;
      throw error;
    }

    return series;
  }

  static async merge(keepId, dropId, userId) {
    if (keepId === dropId) {
      const error = new Error("No se puede mergear una serie consigo misma");
      error.statusCode = 400;
      throw error;
    }

    const [keep, drop] = await Promise.all([
      prisma.series.findUnique({ where: { id: keepId } }),
      prisma.series.findUnique({ where: { id: dropId } }),
    ]);

    if (!keep || !drop) {
      const error = new Error("Una o ambas series no existen");
      error.statusCode = 404;
      throw error;
    }

    const manhwaweb = await prisma.provider.findUnique({
      where: { name: "manhwaweb" },
    });

    await mergeSeries(keepId, dropId, manhwaweb?.id ?? 0);

    await prisma.seriesAlias.upsert({
      where: { alias: drop.name.toLowerCase() },
      create: { seriesId: keepId, alias: drop.name.toLowerCase() },
      update: {},
    });

    logger.info(
      { keepId, dropId, keepName: keep.name, dropName: drop.name, userId },
      "Merge manual de series ejecutado",
    );

    return { keepId, dropName: drop.name };
  }

  static async createRelation(primarySeriesId, fallbackSeriesId) {
    if (primarySeriesId === fallbackSeriesId) {
      const error = new Error(
        "No se puede crear relación de una serie consigo misma",
      );
      error.statusCode = 400;
      throw error;
    }

    const existing = await prisma.seriesRelation.findUnique({
      where: {
        primarySeriesId_fallbackSeriesId: { primarySeriesId, fallbackSeriesId },
      },
    });

    if (existing) {
      const error = new Error("La relación ya existe");
      error.statusCode = 409;
      throw error;
    }

    const rel = await prisma.seriesRelation.create({
      data: { primarySeriesId, fallbackSeriesId },
    });

    // Copiar cover del fallback al primary si el primary no tiene cover
    try {
      const primary = await prisma.series.findUnique({
        where: { id: primarySeriesId },
        select: { cover: true },
      });
      if (!primary.cover) {
        const fallback = await prisma.series.findUnique({
          where: { id: fallbackSeriesId },
          select: { cover: true },
        });
        if (fallback.cover) {
          await prisma.series.update({
            where: { id: primarySeriesId },
            data: { cover: fallback.cover },
          });
        }
      }
    } catch (coverErr) {
      logger.warn({ primarySeriesId, fallbackSeriesId, err: coverErr.message }, "Error copiando cover en vinculación");
    }

    try {
      await updateSeriesMetadata(primarySeriesId);
    } catch (metaErr) {
      logger.warn({ primarySeriesId, err: metaErr.message }, "Error actualizando metadata tras vincular");
    }

    logger.info(
      { primarySeriesId, fallbackSeriesId },
      "SeriesRelation creada desde admin",
    );

    return rel;
  }

  static async deleteRelation(id) {
    const relation = await prisma.seriesRelation.findUnique({
      where: { id },
    });

    if (!relation) {
      const error = new Error("Relación no encontrada");
      error.statusCode = 404;
      throw error;
    }

    const { primarySeriesId } = relation;
    await prisma.seriesRelation.delete({ where: { id } });

    try {
      await updateSeriesMetadata(primarySeriesId);
    } catch (metaErr) {
      logger.warn({ primarySeriesId, err: metaErr.message }, "Error actualizando metadata tras desvincular");
    }

    logger.info({ relationId: id }, "SeriesRelation eliminada desde admin");
  }

  static async addAlias(seriesId, alias) {
    const normalized = alias.toLowerCase().trim();

    if (!normalized) {
      const error = new Error("El alias no puede estar vacío");
      error.statusCode = 400;
      throw error;
    }

    const existing = await prisma.seriesAlias.findUnique({
      where: { alias: normalized },
    });

    if (existing && existing.seriesId !== seriesId) {
      const error = new Error(
        "Ese alias ya está asignado a otra serie",
      );
      error.statusCode = 409;
      throw error;
    }

    const aliasRecord = await prisma.seriesAlias.upsert({
      where: { alias: normalized },
      create: { seriesId, alias: normalized },
      update: {},
    });

    return aliasRecord;
  }

  static async toggleVisibility(id) {
    const series = await prisma.series.findUnique({ where: { id }, select: { visible: true } });

    if (!series) {
      const error = new Error("Serie no encontrada");
      error.statusCode = 404;
      throw error;
    }

    const updated = await prisma.series.update({
      where: { id },
      data: { visible: !series.visible },
      select: { id: true, visible: true },
    });

    logger.info({ seriesId: id, visible: updated.visible }, "Visibilidad de serie cambiada desde admin");

    return updated;
  }

  static async deleteAlias(id) {
    const alias = await prisma.seriesAlias.findUnique({ where: { id } });

    if (!alias) {
      const error = new Error("Alias no encontrado");
      error.statusCode = 404;
      throw error;
    }

    await prisma.seriesAlias.delete({ where: { id } });
  }

  static async getChapters(seriesId, page = 1, limit = CHAPTERS_PER_PAGE, order = "asc") {
    const series = await prisma.series.findUnique({ where: { id: seriesId }, select: { id: true } });
    if (!series) {
      const error = new Error("Serie no encontrada");
      error.statusCode = 404;
      throw error;
    }

    const where = { seriesId };
    const [total, chapters] = await Promise.all([
      prisma.chapter.count({ where }),
      prisma.chapter.findMany({
        where,
        orderBy: { number: order },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { pages: true } },
          providerChapters: {
            include: { provider: { select: { name: true } } },
          },
        },
      }),
    ]);

    const mapped = chapters.map((ch) => ({
      id: ch.id,
      number: ch.number,
      name: ch.name,
      publishedAt: ch.publishedAt,
      pagesScraped: ch.pagesScraped,
      pagesCount: ch._count.pages,
      providers: ch.providerChapters.map((pc) => pc.provider.name),
      createdAt: ch.createdAt,
    }));

    return {
      chapters: mapped,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async bulkDeleteChapters(ids) {
    const chapters = await prisma.chapter.findMany({
      where: { id: { in: ids } },
      select: { id: true, seriesId: true },
    });

    if (chapters.length !== ids.length) {
      const found = new Set(chapters.map((c) => c.id));
      const missing = ids.filter((id) => !found.has(id));
      const error = new Error(`Capítulos no encontrados: ${missing.join(", ")}`);
      error.statusCode = 404;
      throw error;
    }

    const seriesIds = [...new Set(chapters.map((c) => c.seriesId))];
    if (seriesIds.length > 1) {
      const error = new Error("Todos los capítulos deben pertenecer a la misma serie");
      error.statusCode = 400;
      throw error;
    }

    const seriesId = seriesIds[0];

    await prisma.chapter.deleteMany({ where: { id: { in: ids } } });

    await prisma.series.update({
      where: { id: seriesId },
      data: { lastChaptersCheck: null },
    });

    try {
      await updateSeriesMetadata(seriesId);
    } catch (metaErr) {
      logger.warn({ seriesId, err: metaErr.message }, "Error actualizando metadata tras eliminar capítulos");
    }

    logger.info({ seriesId, count: ids.length }, "Capítulos eliminados desde admin");
    return { deleted: ids.length };
  }

  static async toggleProviderSeries(seriesId, psId) {
    const ps = await prisma.providerSeries.findUnique({
      where: { id: psId },
      select: { id: true, seriesId: true, enabled: true },
    });

    if (!ps || ps.seriesId !== seriesId) {
      const error = new Error("ProviderSeries no encontrado para esta serie");
      error.statusCode = 404;
      throw error;
    }

    const updated = await prisma.providerSeries.update({
      where: { id: psId },
      data: { enabled: !ps.enabled },
      select: { id: true, enabled: true },
    });

    logger.info({ seriesId, psId, enabled: updated.enabled }, "ProviderSeries toggled desde admin");
    return updated;
  }
}
