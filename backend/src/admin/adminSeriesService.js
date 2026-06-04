import { prisma } from "../config/prisma.js";
import logger from "../config/logger.js";
import { mergeSeries } from "../manga/scrapers/duplicateSeries.js";

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

    const relation = await prisma.seriesRelation.create({
      data: { primarySeriesId, fallbackSeriesId },
    });

    // Migrar favoritos del fallback al primary
    const existingFavs = await prisma.userFavorite.findMany({
      where: { seriesId: fallbackSeriesId },
      select: { userId: true },
    });

    for (const fav of existingFavs) {
      await prisma.userFavorite.upsert({
        where: {
          userId_seriesId: { userId: fav.userId, seriesId: primarySeriesId },
        },
        create: { userId: fav.userId, seriesId: primarySeriesId },
        update: {},
      });
    }

    await prisma.userFavorite.deleteMany({
      where: { seriesId: fallbackSeriesId },
    });

    // Migrar progreso de lectura del fallback al primary
    const readsToMigrate = await prisma.userChapterRead.findMany({
      where: { chapter: { seriesId: fallbackSeriesId } },
      select: { id: true, userId: true, chapterId: true },
    });

    for (const read of readsToMigrate) {
      const sourceChapter = await prisma.chapter.findUnique({
        where: { id: read.chapterId },
        select: { name: true },
      });
      if (!sourceChapter) continue;

      const primaryChapter = await prisma.chapter.findFirst({
        where: { seriesId: primarySeriesId, name: sourceChapter.name },
      });
      if (primaryChapter) {
        await prisma.userChapterRead.upsert({
          where: {
            userId_chapterId: { userId: read.userId, chapterId: primaryChapter.id },
          },
          create: { userId: read.userId, chapterId: primaryChapter.id },
          update: {},
        });
      }
    }

    const progressToMigrate = await prisma.userChapterProgress.findMany({
      where: { chapter: { seriesId: fallbackSeriesId } },
      select: { id: true, userId: true, chapterId: true, pageNumber: true, percentage: true },
    });

    for (const prog of progressToMigrate) {
      const sourceChapter = await prisma.chapter.findUnique({
        where: { id: prog.chapterId },
        select: { name: true },
      });
      if (!sourceChapter) continue;

      const primaryChapter = await prisma.chapter.findFirst({
        where: { seriesId: primarySeriesId, name: sourceChapter.name },
      });
      if (primaryChapter) {
        await prisma.userChapterProgress.upsert({
          where: {
            userId_chapterId: { userId: prog.userId, chapterId: primaryChapter.id },
          },
          create: {
            userId: prog.userId,
            chapterId: primaryChapter.id,
            pageNumber: prog.pageNumber,
            percentage: prog.percentage,
          },
          update: {},
        });
      }
    }

    logger.info(
      { primarySeriesId, fallbackSeriesId },
      "SeriesRelation creada desde admin",
    );

    return relation;
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

    await prisma.seriesRelation.delete({ where: { id } });

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

  static async deleteAlias(id) {
    const alias = await prisma.seriesAlias.findUnique({ where: { id } });

    if (!alias) {
      const error = new Error("Alias no encontrado");
      error.statusCode = 404;
      throw error;
    }

    await prisma.seriesAlias.delete({ where: { id } });
  }
}
