import { prisma } from "../config/prisma.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";

export async function getUserFavorites(userId) {
  const favorites = await prisma.userFavorite.findMany({
    where: { userId },
    include: {
      series: {
        select: {
          id: true, name: true, slug: true, cover: true,
          status: true, type: true, chapterCount: true, lastChapterPublishedAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (favorites.length === 0) return [];

  const seriesIds = favorites.map((f) => f.seriesId);

  const [readDetails, lastChapterGroup] = await Promise.all([
    prisma.userChapterRead.findMany({
      where: { userId, chapter: { seriesId: { in: seriesIds } } },
      select: { chapter: { select: { seriesId: true, number: true } } },
      orderBy: { chapter: { number: "desc" } },
    }),
    prisma.chapter.groupBy({
      by: ["seriesId"],
      where: { seriesId: { in: seriesIds }, number: { not: null } },
      _max: { number: true },
    }),
  ]);

  const lastChapterMap = new Map(
    lastChapterGroup.map((g) => [g.seriesId, String(g._max.number)]),
  );

  const seriesReadMap = new Map();
  for (const r of readDetails) {
    const sid = r.chapter.seriesId;
    if (!seriesReadMap.has(sid)) {
      seriesReadMap.set(sid, { lastReadChapterName: null });
    }
    const entry = seriesReadMap.get(sid);
    if (!entry.lastReadChapterName) {
      entry.lastReadChapterName = String(r.chapter.number);
    }
  }

  return favorites.map((f) => ({
    ...f,
    lastReadChapterName: seriesReadMap.get(f.seriesId)?.lastReadChapterName ?? null,
    lastAvailableChapterName: lastChapterMap.get(f.seriesId) ?? null,
  }));
}

export async function getFavorite(userId, seriesId) {
  return prisma.userFavorite.findUnique({
    where: { userId_seriesId: { userId, seriesId: Number(seriesId) } },
  });
}

const MAX_FAVORITES = 200;

export async function upsertFavorite(userId, seriesId, status) {
  const seriesIdNum = Number(seriesId);

  const series = await prisma.series.findUnique({
    where: { id: seriesIdNum },
    select: { id: true },
  });

  if (!series) throw new NotFoundError("Serie no encontrada");

  const existing = await prisma.userFavorite.findUnique({
    where: { userId_seriesId: { userId, seriesId: seriesIdNum } },
    select: { id: true },
  });

  if (!existing) {
    const count = await prisma.userFavorite.count({ where: { userId } });
    if (count >= MAX_FAVORITES) {
      throw new ValidationError(`Máximo de ${MAX_FAVORITES} favoritos alcanzado`);
    }
  }

  return prisma.userFavorite.upsert({
    where: { userId_seriesId: { userId, seriesId: seriesIdNum } },
    update: { status },
    create: { userId, seriesId: seriesIdNum, status },
  });
}

export async function deleteFavorite(userId, seriesId) {
  return prisma.userFavorite.delete({
    where: { userId_seriesId: { userId, seriesId: Number(seriesId) } },
  });
}

export async function getSeriesBasicInfo(seriesId) {
  return prisma.series.findUnique({
    where: { id: seriesId },
    select: { name: true },
  });
}
