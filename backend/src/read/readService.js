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

function buildLastReadMap(readRecords) {
  const map = new Map();
  for (const r of readRecords) {
    const sid = r.chapter.seriesId;
    if (!map.has(sid)) {
      map.set(sid, r.chapter.number);
    }
  }
  return map;
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

  // 2. Propagación por número: por cada serie del cluster, si el usuario
  //    avanzó hasta cierto número en ESA serie, marcar capítulos ≤ a ese
  //    máximo en la MISMA serie. Esto evita que desmarcar en una serie
  //    sea anulado por registros de otra serie del cluster.
  const maxBySeries = new Map();
  for (const r of reads) {
    const sid = r.chapter.seriesId;
    if (r.chapter.number && r.chapter.number > (maxBySeries.get(sid) ?? 0)) {
      maxBySeries.set(sid, r.chapter.number);
    }
  }
  if (maxBySeries.size > 0) {
    for (const ch of allChapters) {
      const max = maxBySeries.get(ch.seriesId) ?? 0;
      if (ch.number && ch.number <= max) {
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

  const [chapters, series] = await Promise.all([
    prisma.chapter.findMany({
      where: { seriesId: target.seriesId, number: { lte: target.number } },
      select: { id: true, name: true },
      orderBy: { number: "asc" },
    }),
    prisma.series.findUnique({
      where: { id: target.seriesId },
      select: { name: true },
    }),
  ]);

  if (chapters.length === 0) return { updated: 0, seriesId: target.seriesId, seriesName: series?.name, newChapters: [] };

  const existing = await prisma.userChapterRead.findMany({
    where: { userId, chapter: { seriesId: target.seriesId } },
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
    newChapters: toCreate.map((c) => ({ id: c.id, name: c.name })),
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
  const totalChaptersRead = await prisma.userChapterRead.count({ where: { userId } });

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

  const favSeriesIds = favorites.map((f) => f.seriesId);

  // Resolver clusters para TODOS los favoritos de una vez y obtener
  // todos los IDs del cluster para consultar chapter groupBy
  const allClusterIds = new Set(favSeriesIds);
  const clusterMembership = new Map(); // seriesId → allIds del cluster
  for (const fav of favorites) {
    const sid = fav.seriesId;
    if (clusterMembership.has(sid)) continue;
    const cluster = await resolveSeriesCluster(sid);
    const ids = cluster ? cluster.allIds : [sid];
    clusterMembership.set(sid, ids);
    for (const id of ids) allClusterIds.add(id);
  }

  const allClusterIdArray = [...allClusterIds];

  const [lastChapterGroup, readDetails] = await Promise.all([
    allClusterIdArray.length > 0
      ? prisma.chapter.groupBy({
          by: ["seriesId"],
          where: { seriesId: { in: allClusterIdArray }, number: { not: null } },
          _max: { number: true },
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

  // Construir mapas cluster-aware: max chapter number, reads y lastRead
  // de TODOS los miembros del cluster, no solo de la serie individual
  const clusterLastAvail = new Map();
  const clusterReadCount = new Map();
  const clusterLastRead = new Map();
  for (const fav of favorites) {
    const sid = fav.seriesId;
    if (clusterLastAvail.has(sid)) continue;

    const ids = clusterMembership.get(sid) ?? [sid];

    let maxNum = 0;
    let totalReads = 0;
    let maxLastRead = null;
    for (const id of ids) {
      const n = lastAvailableMap.get(id) ?? 0;
      if (n > maxNum) maxNum = n;
      totalReads += readCountMap.get(id) ?? 0;
      const lr = lastReadMap.get(id);
      if (lr != null && (maxLastRead == null || lr > maxLastRead)) maxLastRead = lr;
    }

    clusterLastAvail.set(sid, maxNum > 0 ? maxNum : null);
    clusterReadCount.set(sid, totalReads);
    clusterLastRead.set(sid, maxLastRead ?? lastReadMap.get(sid) ?? null);
    // También poblar claves para los otros miembros del cluster
    for (const id of ids) {
      if (!clusterLastAvail.has(id)) {
        clusterLastAvail.set(id, maxNum > 0 ? maxNum : null);
        clusterReadCount.set(id, totalReads);
        clusterLastRead.set(id, maxLastRead ?? lastReadMap.get(id) ?? null);
      }
    }
  }

  let completedSeries = 0;
  for (const fav of favorites) {
    const lastRead = clusterLastRead.get(fav.seriesId) ?? -1;
    const lastAvail = clusterLastAvail.get(fav.seriesId) ?? 0;
    if (lastRead >= lastAvail && lastAvail > 0) completedSeries++;
  }

  let totalPercent = 0;
  let seriesWithProgress = 0;
  for (const fav of favorites) {
    const lastRead = clusterLastRead.get(fav.seriesId) ?? 0;
    const lastAvail = clusterLastAvail.get(fav.seriesId) ?? 0;
    if (lastAvail > 0) {
      totalPercent += Math.min((lastRead / lastAvail) * 100, 100);
      seriesWithProgress++;
    }
  }
  const completionPercent = seriesWithProgress > 0 ? Math.round(totalPercent / seriesWithProgress) : 0;

  const fallbackCoverMap = await batchResolveFallbackCovers(favSeriesIds);

  const continueReading = favorites
    .filter((fav) => (clusterReadCount.get(fav.seriesId) ?? 0) > 0)
    .sort((a, b) => {
      const dateA = lastReadDateMap.get(a.seriesId) ?? new Date(0);
      const dateB = lastReadDateMap.get(b.seriesId) ?? new Date(0);
      return new Date(dateB) - new Date(dateA);
    })
    .slice(0, 6)
    .map((fav) => {
      const lastRead = clusterLastRead.get(fav.seriesId) ?? null;
      const lastAvail = clusterLastAvail.get(fav.seriesId) ?? null;
      const readCountForSeries = clusterReadCount.get(fav.seriesId) ?? 0;
      const totalChapters = lastAvail ?? fav.series.chapterCount;
      const chaptersLeft = totalChapters > 0 ? Math.max(0, totalChapters - readCountForSeries) : null;

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

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const chaptersThisMonth = await prisma.userChapterRead.count({
    where: { userId, createdAt: { gte: startOfMonth } },
  });

  return {
    totalChaptersRead,
    totalSeries: favorites.length,
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
  for (const sid of allUniqueIds) {
    if (clusterMaxMap.has(sid)) continue;
    const cluster = await resolveSeriesCluster(sid);
    const ids = cluster ? cluster.allIds : [sid];
    let maxNum = 0;
    for (const id of ids) {
      const n = lastChapterNumberMap.get(id) ?? 0;
      if (n > maxNum) maxNum = n;
    }
    for (const id of ids) {
      clusterMaxMap.set(id, maxNum > 0 ? maxNum : null);
    }
  }

  const totalChaptersRead = reads.length;
  const totalPagesEstimated = totalChaptersRead * 20;
  const estimatedHours = Math.round((totalChaptersRead * 7) / 60);
  const totalSeries = favorites.length;

  const lastReadMap = buildLastReadMap(reads);

  let completedSeries = 0;
  for (const fav of favorites) {
    const lastAvail = clusterMaxMap.get(fav.seriesId);
    if (!lastAvail) continue;
    const lastRead = lastReadMap.get(fav.seriesId) ?? -1;
    if (lastRead >= lastAvail) completedSeries++;
  }

  const startedSeries = lastReadMap.size;
  const completionRate = startedSeries > 0 ? Math.round((completedSeries / startedSeries) * 100) : 0;

  const genreCount = new Map();
  for (const r of reads) {
    const genres = seriesGenreMap.get(r.chapter.seriesId) ?? [];
    for (const name of genres) {
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
    const sid = r.chapter.seriesId;
    seriesReadCount.set(sid, (seriesReadCount.get(sid) ?? 0) + 1);
  }

  const topSeriesIds = [...seriesReadCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);
  const topFallbackMap = await batchResolveFallbackCovers(topSeriesIds);

  const topSeries = topSeriesIds.map((id) => {
    const info = seriesInfoMap.get(id);
    const chaptersRead = seriesReadCount.get(id) ?? 0;
    return {
      name: info?.name,
      slug: info?.slug,
      cover: info?.cover,
      fallbackCover: topFallbackMap.get(id) ?? null,
      chapterCount: info?.chapterCount,
      chaptersRead,
      lastReadChapterName: lastReadMap.get(id) != null ? String(lastReadMap.get(id)) : null,
      lastAvailableChapterName: lastChapterNumberMap.get(id) != null ? String(lastChapterNumberMap.get(id)) : null,
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
