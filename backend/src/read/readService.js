import { prisma } from "../config/prisma.js";
import { NotFoundError } from "../utils/errors.js";
import { batchResolveFallbackCovers, resolveSeriesCluster } from "../manga/seriesCluster.js";

// ─── Streak helpers ────────────────────────────────────────────

function computeStreaks(readDays) {
  let currentStreak = 0;
  let bestStreak = 0;

  if (readDays.length === 0) return { currentStreak, bestStreak };

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  if (readDays[0] === today || readDays[0] === yesterday) {
    currentStreak = 1;
    for (let i = 1; i < readDays.length; i++) {
      const prev = new Date(readDays[i - 1]);
      const curr = new Date(readDays[i]);
      if (Math.round((prev - curr) / 86400000) === 1) currentStreak++;
      else break;
    }
  }

  let streak = 1;
  for (let i = 1; i < readDays.length; i++) {
    const prev = new Date(readDays[i - 1]);
    const curr = new Date(readDays[i]);
    if (Math.round((prev - curr) / 86400000) === 1) {
      streak++;
      bestStreak = Math.max(bestStreak, streak);
    } else {
      streak = 1;
    }
  }
  bestStreak = Math.max(bestStreak, currentStreak);

  return { currentStreak, bestStreak };
}

function getReadDaysSet(readRecords) {
  return [...new Set(readRecords.map((r) => new Date(r.createdAt).toISOString().split("T")[0]))].sort((a, b) => b.localeCompare(a));
}

// ─── Service functions ─────────────────────────────────────────

export async function getReadChapterIds(userId, seriesId) {
  const seriesIdNum = Number(seriesId);

  const series = await prisma.series.findUnique({
    where: { id: seriesIdNum },
    select: { id: true },
  });
  if (!series) throw new NotFoundError("Serie no encontrada");

  // Incluir lecturas de todo el cluster para no perder datos de fallbacks
  const cluster = await resolveSeriesCluster(seriesIdNum);
  const searchIds = cluster ? cluster.allIds : [seriesIdNum];

  const reads = await prisma.userChapterRead.findMany({
    where: { userId, chapter: { seriesId: { in: searchIds } } },
    select: { chapterId: true, chapter: { select: { number: true, seriesId: true } } },
  });

  const explicitIds = reads.map((r) => r.chapterId);

  // Si no hay cluster, solo retornar lecturas explícitas
  if (!cluster || cluster.allIds.length <= 1) return explicitIds;

  // Obtener todos los capítulos del cluster para propagar lecturas
  const allChapters = await prisma.chapter.findMany({
    where: { seriesId: { in: searchIds } },
    select: { id: true, name: true, number: true, seriesId: true },
  });

  const result = new Set(explicitIds);

  // 1. Propagación por nombre exacto: si un capítulo con mismo nombre
  //    en otro miembro del cluster está leído, marcar todos
  const chaptersByName = new Map();
  for (const ch of allChapters) {
    if (!chaptersByName.has(ch.name)) chaptersByName.set(ch.name, []);
    chaptersByName.get(ch.name).push(ch.id);
  }
  for (const ids of chaptersByName.values()) {
    if (ids.length > 1) {
      const anyRead = ids.some((id) => result.has(id));
      if (anyRead) ids.forEach((id) => result.add(id));
    }
  }

  // 2. Propagación por número en TODO el cluster: si el usuario avanzó hasta
  //    cierto número en CUALQUIER miembro del cluster, marcar capítulos ≤ a
  //    ese máximo en TODOS los miembros. Esto es correcto porque
  //    unmarkChaptersFrom borra lecturas en todos los miembros del cluster.
  let globalMaxRead = 0;
  for (const r of reads) {
    if (r.chapter.number && r.chapter.number > globalMaxRead) {
      globalMaxRead = r.chapter.number;
    }
  }
  if (globalMaxRead > 0) {
    for (const ch of allChapters) {
      if (ch.number && ch.number <= globalMaxRead) {
        result.add(ch.id);
      }
    }
  }

  return [...result];
}

export const toggleChapterRead = async (userId, chapterId) => {
  const existing = await prisma.userChapterRead.findUnique({
    where: { userId_chapterId: { userId, chapterId } },
  });

  if (existing) return unmarkChaptersFrom(userId, chapterId);
  return markChaptersUntil(userId, chapterId);
};

export async function markChaptersUntil(userId, chapterId) {
  const target = await prisma.chapter.findUnique({
    where: { id: Number(chapterId) },
    select: { seriesId: true, number: true },
  });

  if (!target) throw new NotFoundError("Chapter not found");

  const cluster = await resolveSeriesCluster(target.seriesId);
  const seriesIds = cluster ? cluster.allIds : [target.seriesId];

  const [chapters, series] = await Promise.all([
    prisma.chapter.findMany({
      where: { seriesId: { in: seriesIds }, number: { lte: target.number, not: null } },
      select: { id: true, name: true, seriesId: true },
      orderBy: { number: "asc" },
    }),
    prisma.series.findUnique({
      where: { id: target.seriesId },
      select: { name: true },
    }),
  ]);

  if (chapters.length === 0) return { updated: 0, seriesId: target.seriesId, seriesName: series?.name, newChapters: [] };

  const existing = await prisma.userChapterRead.findMany({
    where: { userId, chapter: { seriesId: { in: seriesIds } } },
    select: { chapterId: true },
  });

  const existingIds = new Set(existing.map((e) => e.chapterId));
  const toCreate = chapters.filter((c) => !existingIds.has(c.id));

  if (toCreate.length > 0) {
    await prisma.userChapterRead.createMany({
      data: toCreate.map((c) => ({ userId, chapterId: c.id })),
      skipDuplicates: true,
    });
  }

  return {
    updated: chapters.length,
    seriesId: target.seriesId,
    seriesName: series?.name,
    newChapters: toCreate.filter((c) => c.seriesId === target.seriesId).map((c) => ({ id: c.id, name: c.name })),
  };
}

export async function unmarkChaptersFrom(userId, chapterId) {
  const target = await prisma.chapter.findUnique({
    where: { id: Number(chapterId) },
    select: { seriesId: true, number: true },
  });

  if (!target) throw new NotFoundError("Chapter not found");

  // Desmarcar en todos los miembros del cluster para evitar que la
  // propagación por número en getReadChapterIds re-active los capítulos
  const cluster = await resolveSeriesCluster(target.seriesId);
  const seriesIds = cluster ? cluster.allIds : [target.seriesId];

  const chapters = await prisma.chapter.findMany({
    where: { seriesId: { in: seriesIds }, number: { gte: target.number } },
    select: { id: true },
  });

  if (chapters.length === 0) return { updated: 0 };

  await prisma.userChapterRead.deleteMany({
    where: { userId, chapterId: { in: chapters.map((c) => c.id) } },
  });

  return { updated: chapters.length };
}

// ─── Progress tracking ────────────────────────────────────────

export async function upsertChapterProgress(userId, chapterId, { pageNumber, percentage }) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: Number(chapterId) },
    select: { id: true },
  });
  if (!chapter) throw new NotFoundError("Chapter not found");

  const data = {
    userId,
    chapterId: Number(chapterId),
    pageNumber: pageNumber ?? null,
    percentage: percentage ?? null,
  };

  return prisma.userChapterProgress.upsert({
    where: { userId_chapterId: { userId, chapterId: Number(chapterId) } },
    create: data,
    update: { pageNumber: data.pageNumber, percentage: data.percentage },
  });
}

export async function getChapterProgress(userId, chapterId) {
  const progress = await prisma.userChapterProgress.findUnique({
    where: { userId_chapterId: { userId, chapterId: Number(chapterId) } },
  });
  return progress;
}

export async function getSeriesProgress(userId, seriesId) {
  const progresses = await prisma.userChapterProgress.findMany({
    where: {
      userId,
      chapter: { seriesId: Number(seriesId) },
    },
    select: {
      chapterId: true,
      pageNumber: true,
      percentage: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return progresses;
}

export async function getUserReadingStats(userId) {
  let totalChaptersRead = await prisma.userChapterRead.count({ where: { userId } });

  const favorites = await prisma.userFavorite.findMany({
    where: { userId },
    select: {
      seriesId: true,
      series: {
        select: {
          id: true, name: true, slug: true, cover: true,
          chapterCount: true, status: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (favorites.length === 0) {
    return buildEmptyStats(totalChaptersRead);
  }

  // Normalizar clusters: si varios favoritos pertenecen al mismo cluster,
  // solo mantener el primario para evitar duplicados en continueReading.
  const clusterResults = new Map();
  const allClusterIds = new Set();
  for (const fav of favorites) {
    const sid = fav.seriesId;
    if (clusterResults.has(sid)) continue;
    const cluster = await resolveSeriesCluster(sid);
    clusterResults.set(sid, cluster);
    if (cluster) {
      for (const id of cluster.allIds) allClusterIds.add(id);
      // También indexar por primary y todos los miembros para búsqueda rápida
      clusterResults.set(cluster.primary.id, cluster);
      for (const id of cluster.allIds) {
        if (!clusterResults.has(id)) clusterResults.set(id, cluster);
      }
    } else {
      allClusterIds.add(sid);
    }
  }

  const normalizedFavorites = [];
  const seenClusters = new Set();
  for (const fav of favorites) {
    const cluster = clusterResults.get(fav.seriesId);
    const primaryId = cluster?.primary?.id ?? fav.seriesId;
    if (seenClusters.has(primaryId)) continue;
    seenClusters.add(primaryId);
    if (fav.seriesId === primaryId) {
      normalizedFavorites.push(fav);
    } else {
      normalizedFavorites.push({
        ...fav,
        seriesId: primaryId,
        series: { ...fav.series, id: cluster.primary.id, slug: cluster.primary.slug, name: cluster.primary.name, cover: cluster.primary.cover },
      });
    }
  }

  const favSeriesIds = normalizedFavorites.map((f) => f.seriesId);

  // Construir clusterMembership: seriesId → allIds del cluster
  const clusterMembership = new Map();
  for (const fav of normalizedFavorites) {
    const sid = fav.seriesId;
    if (clusterMembership.has(sid)) continue;
    const cluster = clusterResults.get(sid);
    clusterMembership.set(sid, cluster ? cluster.allIds : [sid]);
  }

  const allClusterIdArray = [...allClusterIds];

  const [lastChapterGroup, allChapterNumbers, readDetails] = await Promise.all([
    allClusterIdArray.length > 0
      ? prisma.chapter.groupBy({
          by: ["seriesId"],
          where: { seriesId: { in: allClusterIdArray }, number: { not: null } },
          _max: { number: true },
        })
      : [],
    allClusterIdArray.length > 0
      ? prisma.chapter.findMany({
          where: { seriesId: { in: allClusterIdArray }, number: { not: null } },
          select: { seriesId: true, number: true },
        })
      : [],
    prisma.userChapterRead.findMany({
      where: { userId },
      select: {
        createdAt: true,
        chapter: { select: { seriesId: true, number: true, id: true } },
      },
      orderBy: { chapter: { number: "desc" } },
    }),
  ]);

  const lastAvailableMap = new Map(
    lastChapterGroup.map((g) => [g.seriesId, g._max.number]),
  );

  const lastReadMap = new Map();
  const lastReadDateMap = new Map();
  const readCountMap = new Map();
  for (const r of readDetails) {
    const sid = r.chapter.seriesId;
    if (!lastReadMap.has(sid)) {
      lastReadMap.set(sid, r.chapter.number);
      lastReadDateMap.set(sid, r.createdAt);
    }
    readCountMap.set(sid, (readCountMap.get(sid) ?? 0) + 1);
  }

  // Construir mapas cluster-aware:
  //   clusterLastAvail → max chapter number en el cluster (para display)
  //   clusterChapterCount → total de capítulos DISTINTOS en el cluster (para resta)
  //   clusterReadCount → números de capítulo ÚNICOS leídos en el cluster
  //   clusterLastRead → último número leído en el cluster
  // Usar COUNT en vez de MAX para totalChapters evita errores cuando hay
  // capítulos decimales, gaps, o miembros del cluster con sets incompletos.
  const clusterLastAvail = new Map();
  const clusterChapterCount = new Map();
  const clusterReadCount = new Map();
  const clusterLastRead = new Map();
  for (const fav of normalizedFavorites) {
    const sid = fav.seriesId;
    if (clusterLastAvail.has(sid)) continue;

    const ids = clusterMembership.get(sid) ?? [sid];
    const idSet = new Set(ids);

    let maxNum = 0;
    const totalNumbers = new Set();
    const uniqueReadNumbers = new Set();
    let maxLastRead = null;
    for (const id of ids) {
      const n = lastAvailableMap.get(id) ?? 0;
      if (n > maxNum) maxNum = n;
      for (const r of readDetails) {
        if (r.chapter.seriesId === id && r.chapter.number != null) {
          if (Number.isInteger(r.chapter.number)) uniqueReadNumbers.add(r.chapter.number);
          if (maxLastRead == null || r.chapter.number > maxLastRead) maxLastRead = r.chapter.number;
        }
      }
    }
    // Recolectar números únicos de TODOS los capítulos del cluster
    for (const ch of allChapterNumbers) {
      if (idSet.has(ch.seriesId) && Number.isInteger(ch.number)) totalNumbers.add(ch.number);
    }

    clusterLastAvail.set(sid, maxNum > 0 ? maxNum : null);
    clusterChapterCount.set(sid, totalNumbers.size > 0 ? totalNumbers.size : null);
    clusterReadCount.set(sid, uniqueReadNumbers.size);
    clusterLastRead.set(sid, maxLastRead);
    // Propagar a otros miembros del cluster
    for (const id of ids) {
      if (!clusterLastAvail.has(id)) {
        clusterLastAvail.set(id, maxNum > 0 ? maxNum : null);
        clusterChapterCount.set(id, totalNumbers.size > 0 ? totalNumbers.size : null);
        clusterReadCount.set(id, uniqueReadNumbers.size);
        clusterLastRead.set(id, maxLastRead);
      }
    }
  }

  // Resolver clusters para series leídas pero no favoritas
  // para que la deduplicación cubra todos los clusters
  const readSeriesSet = new Set(readDetails.map((r) => r.chapter.seriesId));
  for (const sid of readSeriesSet) {
    if (clusterResults.has(sid)) continue;
    const cluster = await resolveSeriesCluster(sid);
    clusterResults.set(sid, cluster);
    if (cluster) {
      clusterResults.set(cluster.primary.id, cluster);
      for (const id of cluster.allIds) {
        if (!clusterResults.has(id)) clusterResults.set(id, cluster);
      }
    }
  }

  // Deduplicar total de lecturas por cluster (mismo número en distintos
  // miembros del cluster no debe inflar el conteo)
  const seriesToClusterKey = new Map();
  for (const [sid, cluster] of clusterResults) {
    const key = cluster ? [...cluster.allIds].sort((a, b) => a - b).join(",") : String(sid);
    for (const id of (cluster ? cluster.allIds : [sid])) {
      seriesToClusterKey.set(id, key);
    }
  }
  const clusterNumbers = new Map();
  for (const r of readDetails) {
    if (r.chapter.number == null) continue;
    const key = seriesToClusterKey.get(r.chapter.seriesId) ?? String(r.chapter.seriesId);
    if (!clusterNumbers.has(key)) clusterNumbers.set(key, new Set());
    clusterNumbers.get(key).add(r.chapter.number);
  }
  totalChaptersRead = [...clusterNumbers.values()].reduce((sum, s) => sum + s.size, 0);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisMonthReads = readDetails.filter(r => new Date(r.createdAt) >= startOfMonth);
  const clusterNumbersThisMonth = new Map();
  for (const r of thisMonthReads) {
    if (r.chapter.number == null) continue;
    const key = seriesToClusterKey.get(r.chapter.seriesId) ?? String(r.chapter.seriesId);
    if (!clusterNumbersThisMonth.has(key)) clusterNumbersThisMonth.set(key, new Set());
    clusterNumbersThisMonth.get(key).add(r.chapter.number);
  }
  const chaptersThisMonth = [...clusterNumbersThisMonth.values()].reduce((sum, s) => sum + s.size, 0);

  let completedSeries = 0;
  for (const fav of normalizedFavorites) {
    const lastRead = clusterLastRead.get(fav.seriesId) ?? -1;
    const lastAvail = clusterLastAvail.get(fav.seriesId) ?? 0;
    if (lastRead >= lastAvail && lastAvail > 0) completedSeries++;
  }

  let totalPercent = 0;
  let seriesWithProgress = 0;
  for (const fav of normalizedFavorites) {
    const lastRead = clusterLastRead.get(fav.seriesId) ?? 0;
    const lastAvail = clusterLastAvail.get(fav.seriesId) ?? 0;
    if (lastAvail > 0) {
      totalPercent += Math.min((lastRead / lastAvail) * 100, 100);
      seriesWithProgress++;
    }
  }
  const completionPercent = seriesWithProgress > 0 ? Math.round(totalPercent / seriesWithProgress) : 0;

  const fallbackCoverMap = await batchResolveFallbackCovers(favSeriesIds);

  const continueReading = normalizedFavorites
    .filter((fav) => {
      const readCount = clusterReadCount.get(fav.seriesId) ?? 0;
      if (readCount <= 0) return false;
      const lastAvail = clusterLastAvail.get(fav.seriesId) ?? null;
      const totalCh = clusterChapterCount.get(fav.seriesId) ?? lastAvail ?? fav.series.chapterCount;
      const chaptersLeft = totalCh != null && totalCh > 0 ? Math.max(0, totalCh - readCount) : null;
      return chaptersLeft !== null && chaptersLeft > 0;
    })
    .sort((a, b) => {
      const dateA = lastReadDateMap.get(a.seriesId) ?? new Date(0);
      const dateB = lastReadDateMap.get(b.seriesId) ?? new Date(0);
      return new Date(dateB) - new Date(dateA);
    })
    .slice(0, 14)
    .map((fav) => {
      const lastRead = clusterLastRead.get(fav.seriesId) ?? null;
      const lastAvail = clusterLastAvail.get(fav.seriesId) ?? null;
      const readCountForSeries = clusterReadCount.get(fav.seriesId) ?? 0;
      const totalChapters = clusterChapterCount.get(fav.seriesId) ?? lastAvail ?? fav.series.chapterCount;
      const chaptersLeft = totalChapters != null && totalChapters > 0 ? Math.max(0, totalChapters - readCountForSeries) : null;

      return {
        id: fav.series.id, name: fav.series.name, slug: fav.series.slug,
        cover: fav.series.cover,
        fallbackCover: fallbackCoverMap.get(fav.seriesId) ?? null,
        lastReadChapterName: lastRead != null ? String(lastRead) : null,
        lastAvailableChapterName: lastAvail != null ? String(lastAvail) : null, chaptersLeft,
      };
    });

  const readDays = getReadDaysSet(readDetails);
  const { currentStreak, bestStreak } = computeStreaks(readDays);

  return {
    totalChaptersRead,
    totalSeries: normalizedFavorites.length,
    completedSeries,
    completionPercent,
    estimatedHours: Math.round((totalChaptersRead * 7) / 60),
    currentStreak,
    bestStreak,
    chaptersThisMonth,
    estimatedHoursThisMonth: Math.round((chaptersThisMonth * 7) / 60),
    continueReading,
  };
}

function buildEmptyStats(totalChaptersRead) {
  return {
    totalChaptersRead,
    totalSeries: 0,
    completedSeries: 0,
    completionPercent: 0,
    estimatedHours: Math.round((totalChaptersRead * 7) / 60),
    chaptersThisMonth: 0,
    estimatedHoursThisMonth: 0,
    currentStreak: 0,
    bestStreak: 0,
    continueReading: [],
  };
}

export async function getFullStats(userId) {
  const [reads, favorites] = await Promise.all([
    prisma.userChapterRead.findMany({
      where: { userId },
      select: {
        createdAt: true,
        chapter: { select: { seriesId: true, name: true, number: true } },
      },
      orderBy: { chapter: { number: "desc" } },
    }),
    prisma.userFavorite.findMany({
      where: { userId },
      select: {
        seriesId: true,
        series: {
          select: {
            id: true, name: true, slug: true, cover: true,
            chapterCount: true, status: true,
          },
        },
      },
    }),
  ]);

  const seriesIdsFromReads = [...new Set(reads.map((r) => r.chapter.seriesId))];
  const favSeriesIds = favorites.map((f) => f.seriesId);
  const allSeriesIds = [...new Set([...seriesIdsFromReads, ...favSeriesIds])];

  const [chapterMaxGroup, allSeries] = allSeriesIds.length > 0
    ? await Promise.all([
      prisma.chapter.groupBy({
        by: ["seriesId"],
        where: { seriesId: { in: allSeriesIds }, number: { not: null } },
        _max: { number: true },
      }),
      prisma.series.findMany({
        where: { id: { in: allSeriesIds } },
        select: {
          id: true, name: true, slug: true, cover: true, chapterCount: true,
          genres: { select: { genre: { select: { name: true } } } },
        },
      }),
    ])
    : [[], []];

  const seriesInfoMap = new Map(allSeries.map((s) => [s.id, s]));
  const seriesGenreMap = new Map();
  for (const s of allSeries) {
    seriesGenreMap.set(s.id, s.genres.map((g) => g.genre.name));
  }

  const lastChapterNumberMap = new Map(
    chapterMaxGroup.map((g) => [g.seriesId, g._max.number]),
  );

  // Resolver clusters para todos los IDs relevantes
  const allUniqueIds = [...new Set(allSeriesIds)];
  const clusterMaxMap = new Map();
  const seriesToClusterKey = new Map();
  const seriesToPrimary = new Map();
  const seriesPrimaryInfo = new Map();
  for (const sid of allUniqueIds) {
    if (clusterMaxMap.has(sid)) continue;
    const cluster = await resolveSeriesCluster(sid);
    const ids = cluster ? [...cluster.allIds].sort((a, b) => a - b) : [sid];
    const clusterKey = ids.join(",");
    let maxNum = 0;
    for (const id of ids) {
      const n = lastChapterNumberMap.get(id) ?? 0;
      if (n > maxNum) maxNum = n;
      seriesToClusterKey.set(id, clusterKey);
      seriesToPrimary.set(id, cluster ? cluster.primary.id : id);
    }
    if (cluster) {
      for (const id of ids) seriesPrimaryInfo.set(id, cluster.primary);
    }
    for (const id of ids) {
      clusterMaxMap.set(id, maxNum > 0 ? maxNum : null);
    }
  }

  // Deduplicar lecturas por cluster: mismo número en distintos miembros
  // del cluster no debe inflar el conteo
  const clusterNumbers = new Map();
  for (const r of reads) {
    if (r.chapter.number == null) continue;
    const key = seriesToClusterKey.get(r.chapter.seriesId) ?? String(r.chapter.seriesId);
    if (!clusterNumbers.has(key)) clusterNumbers.set(key, new Set());
    clusterNumbers.get(key).add(r.chapter.number);
  }
  const totalChaptersRead = [...clusterNumbers.values()].reduce((sum, s) => sum + s.size, 0);
  const totalPagesEstimated = totalChaptersRead * 20;
  const estimatedHours = Math.round((totalChaptersRead * 7) / 60);
  const totalSeries = [...new Set(favorites.map((f) => seriesToPrimary.get(f.seriesId) ?? f.seriesId))].length;

  const lastReadMap = new Map();
  for (const r of reads) {
    if (r.chapter.number == null) continue;
    const primaryId = seriesToPrimary.get(r.chapter.seriesId) ?? r.chapter.seriesId;
    if (!lastReadMap.has(primaryId)) {
      lastReadMap.set(primaryId, r.chapter.number);
    }
  }

  const seenFavPrimaries = new Set();
  let completedSeries = 0;
  for (const fav of favorites) {
    const primaryId = seriesToPrimary.get(fav.seriesId) ?? fav.seriesId;
    if (seenFavPrimaries.has(primaryId)) continue;
    seenFavPrimaries.add(primaryId);
    const lastAvail = clusterMaxMap.get(fav.seriesId);
    if (!lastAvail) continue;
    const lastRead = lastReadMap.get(primaryId) ?? -1;
    if (lastRead >= lastAvail) completedSeries++;
  }

  const startedSeries = lastReadMap.size;
  const completionRate = startedSeries > 0 ? Math.round((completedSeries / startedSeries) * 100) : 0;

  const genreCount = new Map();
  const countedGenre = new Set();
  for (const r of reads) {
    const primaryId = seriesToPrimary.get(r.chapter.seriesId) ?? r.chapter.seriesId;
    const genres = seriesGenreMap.get(r.chapter.seriesId) ?? [];
    for (const name of genres) {
      const key = `${primaryId}:${name}`;
      if (countedGenre.has(key)) continue;
      countedGenre.add(key);
      genreCount.set(name, (genreCount.get(name) ?? 0) + 1);
    }
  }

  const sortedGenres = [...genreCount.entries()].sort((a, b) => b[1] - a[1]);
  const topGenre = sortedGenres[0] ?? null;
  const topGenres = sortedGenres.slice(0, 5).map(([name, count]) => ({ name, count }));

  const dayCount = new Array(7).fill(0);
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  for (const r of reads) {
    dayCount[new Date(r.createdAt).getDay()]++;
  }
  const mostActiveDay = dayNames[dayCount.indexOf(Math.max(...dayCount))];
  const activityByDay = dayNames.map((name, i) => ({ name: name.slice(0, 3), count: dayCount[i] }));

  const readDays = getReadDaysSet(reads);
  const { currentStreak, bestStreak } = computeStreaks(readDays);

  const last30 = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last30.push(d.toISOString().split("T")[0]);
  }

  const readsByDate = new Map();
  for (const r of reads) {
    const day = new Date(r.createdAt).toISOString().split("T")[0];
    readsByDate.set(day, (readsByDate.get(day) ?? 0) + 1);
  }
  const activityLast30 = last30.map((date) => ({ date, count: readsByDate.get(date) ?? 0 }));

  const monthlyActivity = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
    monthlyActivity.push({ key, label, count: 0 });
  }
  for (const r of reads) {
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthlyActivity.find((m) => m.key === key);
    if (entry) entry.count++;
  }

  const seriesReadCount = new Map();
  for (const r of reads) {
    if (r.chapter.number == null) continue;
    const primaryId = seriesToPrimary.get(r.chapter.seriesId) ?? r.chapter.seriesId;
    seriesReadCount.set(primaryId, (seriesReadCount.get(primaryId) ?? 0) + 1);
  }

  const topSeriesIds = [...seriesReadCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);
  const topFallbackMap = await batchResolveFallbackCovers(topSeriesIds);

  const topSeries = topSeriesIds.map((id) => {
    const info = seriesPrimaryInfo.get(id) ?? seriesInfoMap.get(id);
    const chaptersRead = seriesReadCount.get(id) ?? 0;
    return {
      name: info?.name,
      slug: info?.slug,
      cover: info?.cover,
      fallbackCover: topFallbackMap.get(id) ?? null,
      chapterCount: info?.chapterCount,
      chaptersRead,
      lastReadChapterName: lastReadMap.get(id) != null ? String(lastReadMap.get(id)) : null,
      lastAvailableChapterName: clusterMaxMap.get(id) != null ? String(clusterMaxMap.get(id)) : null,
    };
  });

  const firstReadDate =
    reads.length > 0
      ? new Date(Math.min(...reads.map((r) => new Date(r.createdAt)))).toISOString()
      : null;
  const avgChaptersPerDay = readDays.length > 0 ? Math.round(totalChaptersRead / readDays.length) : 0;

  return {
    totalChaptersRead,
    totalPagesEstimated,
    estimatedHours,
    totalSeries,
    startedSeries,
    completedSeries,
    completionRate,
    topGenre: topGenre ? topGenre[0] : null,
    topGenres,
    mostActiveDay,
    activityByDay,
    currentStreak,
    bestStreak,
    activityLast30,
    monthlyActivity,
    topSeries,
    firstReadDate,
    avgChaptersPerDay,
    totalActiveDays: readDays.length,
  };
}
