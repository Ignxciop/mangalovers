import { prisma } from "../config/prisma.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { batchResolveFallbackCovers, resolveSeriesCluster } from "../manga/seriesCluster.js";

const FAVORITE_INCLUDE = {
  series: {
    select: {
      id: true, name: true, slug: true, cover: true,
      status: true, type: true, chapterCount: true, lastChapterPublishedAt: true,
    },
  },
};

async function normalizeFavoriteCluster(favorites) {
  if (favorites.length === 0) return [];

  const ids = [...new Set(favorites.map((f) => f.seriesId))];
  const clusters = await Promise.all(ids.map((id) => resolveSeriesCluster(id)));
  const seriesToPrimary = new Map();
  const primaryInfo = new Map();
  for (let i = 0; i < ids.length; i++) {
    const p = clusters[i]?.primary;
    seriesToPrimary.set(ids[i], p?.id ?? ids[i]);
    if (p) primaryInfo.set(ids[i], { id: p.id, slug: p.slug, name: p.name });
  }

  const seen = new Set();
  const result = [];
  for (const fav of favorites) {
    const primaryId = seriesToPrimary.get(fav.seriesId);
    if (seen.has(primaryId)) continue;
    seen.add(primaryId);
    if (fav.seriesId === primaryId) {
      result.push(fav);
    } else {
      const info = primaryInfo.get(fav.seriesId);
      result.push({
        ...fav,
        seriesId: primaryId,
        series: info ? { ...fav.series, id: info.id, slug: info.slug, name: info.name } : fav.series,
      });
    }
  }
  return result;
}

async function enrichFavorites(favorites, userId) {
  if (favorites.length === 0) return [];

  const seriesIds = favorites.map((f) => f.seriesId);

  // Incluir ids de todo el cluster para consultar lecturas
  const clusters = await Promise.all(seriesIds.map((id) => resolveSeriesCluster(id)));
  const readSearchIds = new Set(seriesIds);
  const seriesIdToPrimary = new Map();
  for (let i = 0; i < favorites.length; i++) {
    const c = clusters[i];
    if (c) {
      for (const id of c.allIds) seriesIdToPrimary.set(id, c.primary.id);
    } else {
      seriesIdToPrimary.set(favorites[i].seriesId, favorites[i].seriesId);
    }
    if (c) c.allIds.forEach((id) => readSearchIds.add(id));
  }
  const searchIds = [...readSearchIds];

  const fallbackCoverMap = await batchResolveFallbackCovers(seriesIds);

  const [readDetails, lastChapterGroup] = await Promise.all([
    prisma.userChapterRead.findMany({
      where: { userId, chapter: { seriesId: { in: searchIds } } },
      select: { chapter: { select: { seriesId: true, number: true } } },
      orderBy: { chapter: { number: "desc" } },
    }),
    prisma.chapter.groupBy({
      by: ["seriesId"],
      where: { seriesId: { in: searchIds }, number: { not: null } },
      _max: { number: true },
    }),
  ]);

  // Colapsar máximos del cluster
  const lastChapterMap = new Map();
  for (const g of lastChapterGroup) {
    const mappedId = seriesIdToPrimary.get(g.seriesId) ?? g.seriesId;
    const current = lastChapterMap.get(mappedId);
    if (!current || g._max.number > parseFloat(current)) {
      lastChapterMap.set(mappedId, String(g._max.number));
    }
  }

  const seriesReadMap = new Map();
  for (const r of readDetails) {
    const sid = r.chapter.seriesId;
    const mappedId = seriesIdToPrimary.get(sid) ?? sid;
    if (!seriesReadMap.has(mappedId)) {
      seriesReadMap.set(mappedId, { lastReadChapterName: null });
    }
    const entry = seriesReadMap.get(mappedId);
    if (!entry.lastReadChapterName) {
      entry.lastReadChapterName = String(r.chapter.number);
    }
  }

  return favorites.map((f) => ({
    ...f,
    series: {
      ...f.series,
      fallbackCover: fallbackCoverMap.get(f.seriesId) ?? null,
    },
    lastReadChapterName: seriesReadMap.get(f.seriesId)?.lastReadChapterName ?? null,
    lastAvailableChapterName: lastChapterMap.get(f.seriesId) ?? null,
  }));
}

export async function getUserFavorites(userId) {
  const favorites = await prisma.userFavorite.findMany({
    where: { userId },
    include: FAVORITE_INCLUDE,
    orderBy: { updatedAt: "desc" },
  });

  const normalized = await normalizeFavoriteCluster(favorites);
  return enrichFavorites(normalized, userId);
}

export async function getUserFavoritesPaginated(userId, page, limit) {
  const where = { userId };

  const [favorites, total] = await Promise.all([
    prisma.userFavorite.findMany({
      where,
      include: FAVORITE_INCLUDE,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.userFavorite.count({ where }),
  ]);

  const normalized = await normalizeFavoriteCluster(favorites);
  return { data: await enrichFavorites(normalized, userId), total: normalized.length };
}

export async function getFavorite(userId, seriesId) {
  const seriesIdNum = Number(seriesId);

  let fav = await prisma.userFavorite.findUnique({
    where: { userId_seriesId: { userId, seriesId: seriesIdNum } },
  });
  if (fav) return fav;

  // Si no hay favorito directo, buscar en el cluster
  const cluster = await resolveSeriesCluster(seriesIdNum);
  if (cluster) {
    for (const id of cluster.allIds) {
      if (id === seriesIdNum) continue;
      fav = await prisma.userFavorite.findUnique({
        where: { userId_seriesId: { userId, seriesId: id } },
      });
      if (fav) return fav;
    }
  }

  return null;
}

const MAX_FAVORITES = 200;

export async function upsertFavorite(userId, seriesId, status) {
  const seriesIdNum = Number(seriesId);

  const series = await prisma.series.findUnique({
    where: { id: seriesIdNum },
    select: { id: true },
  });

  if (!series) throw new NotFoundError("Serie no encontrada");

  // Operar siempre sobre la primaria del cluster
  const cluster = await resolveSeriesCluster(seriesIdNum);
  const primaryId = cluster?.primary.id ?? seriesIdNum;

  const existing = await prisma.userFavorite.findUnique({
    where: { userId_seriesId: { userId, seriesId: primaryId } },
    select: { id: true },
  });

  if (!existing) {
    const count = await prisma.userFavorite.count({ where: { userId } });
    if (count >= MAX_FAVORITES) {
      throw new ValidationError(`Máximo de ${MAX_FAVORITES} favoritos alcanzado`);
    }
  }

  // Limpiar duplicados de otros miembros del cluster
  if (cluster) {
    await prisma.userFavorite.deleteMany({
      where: { userId, seriesId: { in: cluster.allIds.filter((id) => id !== primaryId) } },
    });
  }

  return prisma.userFavorite.upsert({
    where: { userId_seriesId: { userId, seriesId: primaryId } },
    update: { status },
    create: { userId, seriesId: primaryId, status },
  });
}

export async function deleteFavorite(userId, seriesId) {
  const seriesIdNum = Number(seriesId);

  // Eliminar de todo el cluster para limpiar duplicados
  const cluster = await resolveSeriesCluster(seriesIdNum);
  const ids = cluster ? cluster.allIds : [seriesIdNum];

  const result = await prisma.userFavorite.deleteMany({
    where: { userId, seriesId: { in: ids } },
  });

  if (result.count === 0) {
    throw new NotFoundError("Favorito no encontrado");
  }

  return result;
}

export async function getSeriesBasicInfo(seriesId) {
  return prisma.series.findUnique({
    where: { id: seriesId },
    select: { name: true },
  });
}
