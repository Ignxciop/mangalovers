import { prisma } from "../config/prisma.js";
import { NotFoundError } from "../utils/errors.js";

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

  const seriesList = await prisma.series.findMany({
    where, skip, take: Number(limit), orderBy,
    select: {
      id: true, name: true, slug: true, cover: true,
      status: true, chapterCount: true, updatedAt: true,
      lastChapterPublishedAt: true, type: true,
      providerSeries: { select: { provider: { select: { name: true } } } },
    },
  });

  const seriesIds = seriesList.map((s) => s.id);

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
          orderBy: { createdAt: "desc" },
          take: 50,
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
  const series = await prisma.series.findMany({
    where: { lastChapterPublishedAt: { not: null } },
    orderBy: { lastChapterPublishedAt: "desc" },
    take: Number(limit),
    select: { id: true, name: true, slug: true, cover: true, chapterCount: true, lastChapterPublishedAt: true },
  });

  if (series.length === 0) return [];

  const seriesIds = series.map((s) => s.id);

  const [chapterMaxGroup, readDetails] = await Promise.all([
    prisma.chapter.groupBy({
      by: ["seriesId"],
      where: { seriesId: { in: seriesIds } },
      _max: { number: true },
    }),
    userId
      ? prisma.userChapterRead.findMany({
          where: { userId, chapter: { seriesId: { in: seriesIds } } },
          select: { chapter: { select: { seriesId: true, number: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
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
    lastAvailableChapterName: lastChapterMap.get(s.id) ?? null,
    lastReadChapterName: lastReadMap.get(s.id) ?? null,
  }));
}

export async function getSeriesDetailBySlug(slug) {
  const series = await prisma.series.findUnique({
    where: { slug },
    include: {
      genres: { include: { genre: true } },
      providerSeries: { include: { provider: true } },
    },
  });

  if (!series) throw new NotFoundError("Serie no encontrada");

  const chapters = await prisma.chapter.findMany({
    where: { seriesId: series.id },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
  });

  return {
    id: series.id, name: series.name, slug: series.slug,
    cover: isValidImageUrl(series.cover) ? series.cover : null,
    status: series.status, type: series.type,
    summary: series.summary, chapterCount: series.chapterCount,
    genres: series.genres.map((g) => g.genre.name),
    providers: series.providerSeries.map((p) => ({
      provider: p.provider.name,
      externalSlug: p.slug,
      externalUrl: isValidImageUrl(p.url) ? p.url : null,
    })),
    chapters: chapters.map((c) => ({
      id: c.id, name: c.name, publishedAt: c.publishedAt, createdAt: c.createdAt,
      chapterNumber: c.number ?? 0,
    })),
  };
}

export async function getChapterPages(slug, chapterId, _userId = null) {
  const series = await prisma.series.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!series) throw new NotFoundError("Serie no encontrada");

  const chapter = await prisma.chapter.findFirst({
    where: { id: Number(chapterId), seriesId: series.id },
    include: {
      pages: { orderBy: { id: "asc" } },
      series: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!chapter) throw new NotFoundError("Capítulo no encontrado");

  const [prev, next] = await Promise.all([
    prisma.chapter.findFirst({
      where: { seriesId: chapter.seriesId, number: { lt: chapter.number } },
      orderBy: { number: "desc" },
      select: { id: true, name: true },
    }),
    prisma.chapter.findFirst({
      where: { seriesId: chapter.seriesId, number: { gt: chapter.number } },
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
  };
}

export async function getRecommendedSeries(userId, limit = 12) {
  const reads = await prisma.userChapterRead.findMany({
    where: { userId },
    select: {
      chapter: {
        select: {
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
  for (const r of reads) {
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

  const candidates = await prisma.series.findMany({
    where: {
      id: { notIn: favIds.length > 0 ? favIds : [-1] },
      genres: { some: { genre: { name: { in: topGenres } } } },
    },
    select: {
      id: true, name: true, slug: true, cover: true,
      status: true, chapterCount: true, type: true,
      genres: { select: { genre: { select: { name: true } } } },
    },
    take: 50,
  });

  const scored = candidates
    .filter((s) => !favIds.includes(s.id))
    .map((s) => {
      const seriesGenres = s.genres.map((g) => g.genre.name);
      const score = topGenres.filter((g) => seriesGenres.includes(g)).length;
      return { ...s, score, genres: seriesGenres };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { series: scored, basedOn: topGenres };
}
