import { prisma } from "../config/prisma.js";
import { NotFoundError } from "../utils/errors.js";
import { resolveSeriesCluster, batchResolveFallbackCovers } from "./seriesCluster.js";
import axios from "axios";

const HEAD_TIMEOUT_MS = 3000;

function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function getAllManga(query, userId = null) {
  const {
    page = 1, limit = 24, search, provider,
    status, sort = "updated", order = "desc", genres, type,
  } = query;

  const skip = (page - 1) * limit;
  const where = {};

  where.visible = true;
  where.fallbackRelations = { none: {} };

  if (search) {
    where.name = { contains: search.replace(/[%_\\]/g, "\\$&"), mode: "insensitive" };
  }

  if (status) where.status = status;
  if (provider) where.providerSeries = { some: { provider: { name: provider } } };
  if (type) where.type = type;

  if (genres) {
    const genreList = genres.split(",").map((g) => g.trim()).filter(Boolean);
    if (genreList.length > 0) {
      where.genres = { some: { genre: { name: { in: genreList } } } };
    }
  }

  let orderBy = { lastChapterPublishedAt: "desc" };
  if (sort === "chapters") orderBy = { chapterCount: order };
  if (sort === "az") orderBy = { name: "asc" };
  if (sort === "za") orderBy = { name: "desc" };
  if (sort === "updated" || !sort) {
    where.lastChapterPublishedAt = { not: null };
  }

  // Fetch extra items para compensar dedup de clusters
  const fetchLimit = Number(limit) * 3;
  const rawList = await prisma.series.findMany({
    where, skip, take: fetchLimit, orderBy,
    select: {
      id: true, name: true, slug: true, cover: true,
      status: true, chapterCount: true, updatedAt: true,
      lastChapterPublishedAt: true, type: true,
      providerSeries: { select: { provider: { select: { name: true } } } },
    },
  });

  // Deduplicar: mostrar solo el primary de cada cluster
  const allIds = rawList.map((s) => s.id);
  const relations = allIds.length > 0
    ? await prisma.seriesRelation.findMany({
        where: {
          OR: [
            { primarySeriesId: { in: allIds } },
            { fallbackSeriesId: { in: allIds } },
          ],
        },
        select: { primarySeriesId: true, fallbackSeriesId: true },
      })
    : [];

  const hideIds = new Set();
  for (const rel of relations) {
    if (allIds.includes(rel.primarySeriesId)) {
      hideIds.add(rel.fallbackSeriesId);
    }
  }

  const seriesList = rawList.filter((s) => !hideIds.has(s.id)).slice(0, Number(limit));
  const seriesIds = seriesList.map((s) => s.id);

  const fallbackCoverMap = await batchResolveFallbackCovers(seriesIds);

  const [chapterMaxGroup, readDetails, total] = await Promise.all([
    seriesIds.length > 0
      ? prisma.chapter.groupBy({
          by: ["seriesId"],
          where: { seriesId: { in: seriesIds } },
          _max: { number: true },
        })
      : [],
    userId && seriesIds.length > 0
      ? prisma.userChapterRead.findMany({
          where: { userId, chapter: { seriesId: { in: seriesIds } } },
          select: { chapter: { select: { seriesId: true, number: true } } },
          orderBy: { chapter: { number: "desc" } },
        })
      : [],
    prisma.series.count({ where }),
  ]);

  const lastChapterMap = new Map(
    chapterMaxGroup.map((g) => [g.seriesId, g._max.number]),
  );

  const lastReadMap = new Map();
  for (const r of readDetails) {
    const sid = r.chapter.seriesId;
    if (!lastReadMap.has(sid)) {
      lastReadMap.set(sid, String(r.chapter.number));
    }
  }

  return {
    data: seriesList.map((s) => ({
      id: s.id, name: s.name, slug: s.slug,
      cover: isValidImageUrl(s.cover) ? s.cover : null,
      fallbackCover: fallbackCoverMap.get(s.id) ?? null,
      status: s.status, chapterCount: s.chapterCount,
      lastChapterNumber: lastChapterMap.get(s.id) ?? null,
      lastReadChapterName: lastReadMap.get(s.id) ?? null,
      updatedAt: s.updatedAt, lastChapterPublishedAt: s.lastChapterPublishedAt,
      type: s.type, providers: s.providerSeries.map((ps) => ps.provider.name),
    })),
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
  };
}

export async function getAllGenres() {
  return prisma.genre.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getLatestManga(userId, limit = 16) {
  const fetchLimit = Number(limit) * 3;
  const raw = await prisma.series.findMany({
    where: {
      visible: true,
      lastChapterPublishedAt: { not: null },
      fallbackRelations: { none: {} },
    },
    orderBy: { lastChapterPublishedAt: "desc" },
    take: fetchLimit,
    select: { id: true, name: true, slug: true, cover: true, chapterCount: true, lastChapterPublishedAt: true },
  });

  if (raw.length === 0) return [];

  const allIds = raw.map((s) => s.id);
  const relations = await prisma.seriesRelation.findMany({
    where: { OR: [{ primarySeriesId: { in: allIds } }, { fallbackSeriesId: { in: allIds } }] },
    select: { primarySeriesId: true, fallbackSeriesId: true },
  });

  const hideIds = new Set();
  for (const rel of relations) {
    if (allIds.includes(rel.primarySeriesId)) hideIds.add(rel.fallbackSeriesId);
  }

  const series = raw.filter((s) => !hideIds.has(s.id)).slice(0, Number(limit));

  const seriesIds = series.map((s) => s.id);
  const fallbackCoverMap = await batchResolveFallbackCovers(seriesIds);

  const [chapterMaxGroup, readDetails] = await Promise.all([
    seriesIds.length > 0
      ? prisma.chapter.groupBy({
          by: ["seriesId"],
          where: { seriesId: { in: seriesIds } },
          _max: { number: true },
        })
      : [],
    userId
      ? prisma.userChapterRead.findMany({
          where: { userId, chapter: { seriesId: { in: seriesIds } } },
          select: { chapter: { select: { seriesId: true, number: true } } },
          orderBy: { chapter: { number: "desc" } },
        })
      : [],
  ]);

  const lastChapterMap = new Map(
    chapterMaxGroup.map((g) => [g.seriesId, g._max.number]),
  );

  const lastReadMap = new Map();
  for (const r of readDetails) {
    const sid = r.chapter.seriesId;
    if (!lastReadMap.has(sid)) {
      lastReadMap.set(sid, String(r.chapter.number));
    }
  }

  return series.map((s) => ({
    ...s,
    cover: isValidImageUrl(s.cover) ? s.cover : null,
    fallbackCover: fallbackCoverMap.get(s.id) ?? null,
    lastAvailableChapterName: lastChapterMap.get(s.id) ?? null,
    lastReadChapterName: lastReadMap.get(s.id) ?? null,
  }));
}

export async function getSeriesDetailBySlug(slug) {
  const series = await prisma.series.findUnique({
    where: { slug, visible: true },
    include: {
      genres: { include: { genre: true } },
      providerSeries: { include: { provider: true } },
    },
  });

  if (!series) throw new NotFoundError("Serie no encontrada");

  // Resolver cluster y determinar primary por prioridad de provider
  const cluster = await resolveSeriesCluster(series.id);
  const primaryId = cluster?.primary.id ?? series.id;

  // Si el slug accedido no es del primary, cargar datos del primary
  let primarySeries = series;
  if (primaryId !== series.id) {
    primarySeries = await prisma.series.findUnique({
      where: { id: primaryId },
      include: {
        genres: { include: { genre: true } },
        providerSeries: { include: { provider: true } },
      },
    });
  }

  const chapters = await prisma.chapter.findMany({
    where: { seriesId: primarySeries.id },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
  });

  const providerEntries = [];
  const seenProviderNames = new Set();

  for (const ps of primarySeries.providerSeries) {
    if (!seenProviderNames.has(ps.provider.name)) {
      seenProviderNames.add(ps.provider.name);
      providerEntries.push({
        provider: ps.provider.name,
        externalSlug: ps.slug,
        externalUrl: isValidImageUrl(ps.url) ? ps.url : null,
      });
    }
  }

  if (cluster) {
    for (const fb of cluster.fallbacks) {
      for (const ps of fb.providerSeries ?? []) {
        if (!seenProviderNames.has(ps.provider)) {
          seenProviderNames.add(ps.provider);
          providerEntries.push({
            provider: ps.provider,
            externalSlug: ps.externalSlug,
            externalUrl: isValidImageUrl(ps.externalUrl) ? ps.externalUrl : null,
          });
        }
      }
    }
  }

  let fallbackCover = null;
  if (cluster) {
    for (const fb of cluster.fallbacks) {
      if (isValidImageUrl(fb.cover)) {
        fallbackCover = fb.cover;
        break;
      }
    }
  }

  return {
    id: primarySeries.id, name: primarySeries.name, slug: primarySeries.slug,
    cover: isValidImageUrl(primarySeries.cover) ? primarySeries.cover : null,
    fallbackCover,
    status: primarySeries.status, type: primarySeries.type,
    summary: primarySeries.summary, chapterCount: primarySeries.chapterCount,
    genres: primarySeries.genres.map((g) => g.genre.name),
    providers: providerEntries,
    chapters: chapters.map((c) => ({
      id: c.id, name: c.name, publishedAt: c.publishedAt, createdAt: c.createdAt,
      chapterNumber: c.number ?? 0,
    })),
    _cluster: cluster ? {
      primarySlug: cluster.primary.slug,
      primaryName: cluster.primary.name,
      fallbacks: cluster.fallbacks.map((f) => ({ slug: f.slug, name: f.name, cover: f.cover })),
    } : null,
  };
}

async function findFallbackChapter(searchIds, excludeSeriesId, number) {
  const fallbackIds = searchIds.filter((id) => id !== excludeSeriesId);
  if (fallbackIds.length === 0) return null;
  return prisma.chapter.findFirst({
    where: {
      seriesId: { in: fallbackIds },
      number,
      pages: { some: {} },
    },
    include: { pages: { orderBy: { id: "asc" } } },
  });
}

async function probeFirstPage(url) {
  if (!url) return false;
  try {
    const res = await axios.head(url, { timeout: HEAD_TIMEOUT_MS });
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
}

export async function getChapterPages(slug, chapterId, _userId = null) {
  const series = await prisma.series.findUnique({
    where: { slug, visible: true },
    select: { id: true },
  });

  if (!series) throw new NotFoundError("Serie no encontrada");

  const cluster = await resolveSeriesCluster(series.id);
  const searchIds = cluster ? cluster.allIds : [series.id];

  const chapter = await prisma.chapter.findFirst({
    where: { id: Number(chapterId), seriesId: { in: searchIds } },
    include: {
      pages: { orderBy: { id: "asc" } },
      series: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!chapter) throw new NotFoundError("Capítulo no encontrado");

  if (chapter.pages.length > 0 && cluster) {
    const primaryOk = await probeFirstPage(chapter.pages[0].url);
    if (!primaryOk) {
      const fallbackChapter = await findFallbackChapter(
        searchIds,
        chapter.seriesId,
        chapter.number,
      );
      if (fallbackChapter) {
        chapter.pages = fallbackChapter.pages;
        chapter.series = {
          id: fallbackChapter.seriesId,
          name: chapter.series.name,
          slug: chapter.series.slug,
        };
      }
    }
  } else if (cluster) {
    const fallbackChapter = await findFallbackChapter(
      searchIds,
      chapter.seriesId,
      chapter.number,
    );
    if (fallbackChapter) {
      chapter.pages = fallbackChapter.pages;
      chapter.series = {
        id: fallbackChapter.seriesId,
        name: chapter.series.name,
        slug: chapter.series.slug,
      };
    }
  }

  let fallbackPages = null;
  if (chapter.pages.length > 0 && cluster) {
    const fallbackChapter = await findFallbackChapter(
      searchIds,
      chapter.seriesId,
      chapter.number,
    );
    if (fallbackChapter && fallbackChapter.pages.length > 0) {
      fallbackPages = fallbackChapter.pages.map((p) => ({ id: p.id, url: p.url }));
    }
  }

  const [prev, next] = await Promise.all([
    prisma.chapter.findFirst({
      where: { seriesId: { in: searchIds }, number: { lt: chapter.number } },
      orderBy: { number: "desc" },
      select: { id: true, name: true },
    }),
    prisma.chapter.findFirst({
      where: { seriesId: { in: searchIds }, number: { gt: chapter.number } },
      orderBy: { number: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return {
    chapterId: chapter.id,
    name: chapter.name,
    number: chapter.number,
    publishedAt: chapter.publishedAt,
    series: chapter.series,
    prev: prev ?? null,
    next: next ?? null,
    pages: chapter.pages.map((p) => ({ id: p.id, url: p.url })),
    fallbackPages,
  };
}

function getWeekSeed() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (24 * 60 * 60 * 1000));
  const week = Math.ceil((dayOfYear + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-${String(week).padStart(2, "0")}`;
}

function hashStr(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function getRecommendedSeries(userId, limit = 12) {
  const reads = await prisma.userChapterRead.findMany({
    where: { userId },
    select: {
      chapter: {
        select: {
          seriesId: true,
          series: {
            select: { genres: { select: { genre: { select: { name: true } } } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const genreCount = new Map();
  const readSeriesSet = new Set();
  for (const r of reads) {
    readSeriesSet.add(r.chapter.seriesId);
    for (const g of r.chapter.series.genres) {
      const name = g.genre.name;
      genreCount.set(name, (genreCount.get(name) ?? 0) + 1);
    }
  }

  const topGenres = [...genreCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  if (topGenres.length === 0) return { series: [], basedOn: [] };

  const favorites = await prisma.userFavorite.findMany({
    where: { userId },
    select: { seriesId: true },
  });

  const favIds = favorites.map((f) => f.seriesId);
  const excludeIds = [...new Set([...favIds, ...readSeriesSet])];

  const rawCandidates = await prisma.series.findMany({
    where: {
      visible: true,
      id: { notIn: excludeIds.length > 0 ? excludeIds : [-1] },
      fallbackRelations: { none: {} },
      genres: { some: { genre: { name: { in: topGenres } } } },
    },
    select: {
      id: true, name: true, slug: true, cover: true,
      status: true, chapterCount: true, type: true,
      genres: { select: { genre: { select: { name: true } } } },
    },
    take: 50,
  });

  // Dedup: filtrar fallbacks de clusters
  const rawIds = rawCandidates.map((s) => s.id);
  const relations = await prisma.seriesRelation.findMany({
    where: { OR: [{ primarySeriesId: { in: rawIds } }, { fallbackSeriesId: { in: rawIds } }] },
    select: { primarySeriesId: true, fallbackSeriesId: true },
  });
  const hideIds = new Set();
  for (const rel of relations) {
    if (rawIds.includes(rel.primarySeriesId)) hideIds.add(rel.fallbackSeriesId);
  }

  const candidates = rawCandidates.filter((s) => !hideIds.has(s.id));

  const weekSeed = getWeekSeed();

  const scored = candidates
    .filter((s) => !excludeIds.includes(s.id))
    .map((s) => {
      const seriesGenres = s.genres.map((g) => g.genre.name);
      const score = topGenres.filter((g) => seriesGenres.includes(g)).length;
      const rotation = hashStr(weekSeed + String(s.id)) % 10000;
      return { ...s, score, genres: seriesGenres, rotation };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.rotation - b.rotation;
    })
    .slice(0, limit);

  return { series: scored, basedOn: topGenres };
}
