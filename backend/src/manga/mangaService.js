import { prisma } from "../config/prisma.js";
import { markChaptersUntil } from "../read/readService.js";

export async function getAllManga(query) {
    const {
        page = 1,
        limit = 24,
        search,
        provider,
        status,
        sort = "updated",
        order = "desc",
        genres,
        type,
    } = query;

    const skip = (page - 1) * limit;
    const where = {};

    if (search) {
        where.name = { contains: search, mode: "insensitive" };
    }

    if (status) {
        where.status = status;
    }

    if (provider) {
        where.providerSeries = {
            some: { provider: { name: provider } },
        };
    }

    if (type) {
        where.type = type;
    }

    if (genres) {
        const genreList = genres
            .split(",")
            .map((g) => g.trim())
            .filter(Boolean);

        if (genreList.length > 0) {
            where.genres = {
                some: {
                    genre: { name: { in: genreList } },
                },
            };
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
        where,
        skip,
        take: Number(limit),
        orderBy,
        select: {
            id: true,
            name: true,
            slug: true,
            cover: true,
            status: true,
            chapterCount: true,
            updatedAt: true,
            lastChapterPublishedAt: true,
            type: true,
            providerSeries: {
                select: { provider: { select: { name: true } } },
            },
        },
    });

    const seriesIds = seriesList.map((s) => s.id);

    let chapterNames = [];
    if (seriesIds.length > 0) {
        chapterNames = await prisma.chapter.findMany({
            where: { seriesId: { in: seriesIds } },
            select: { seriesId: true, name: true },
        });
    }

    const lastChapterMap = new Map();
    for (const c of chapterNames) {
        const num = parseFloat(c.name);
        if (!isNaN(num)) {
            const current = lastChapterMap.get(c.seriesId);
            if (current === undefined || num > current) {
                lastChapterMap.set(c.seriesId, num);
            }
        }
    }

    const total = await prisma.series.count({ where });

    return {
        data: seriesList.map((s) => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            cover: s.cover,
            status: s.status,
            chapterCount: s.chapterCount,
            lastChapterNumber: lastChapterMap.get(s.id) ?? null,
            updatedAt: s.updatedAt,
            lastChapterPublishedAt: s.lastChapterPublishedAt,
            type: s.type,
            providers: s.providerSeries.map((ps) => ps.provider.name),
        })),
        meta: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
        },
    };
}

export async function getAllGenres() {
    const genres = await prisma.genre.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
    });
    return genres;
}

export async function getLatestManga(userId, limit = 16) {
    const series = await prisma.series.findMany({
        where: { lastChapterPublishedAt: { not: null } },
        orderBy: { lastChapterPublishedAt: "desc" },
        take: Number(limit),
        select: {
            id: true,
            name: true,
            slug: true,
            cover: true,
            chapterCount: true,
            lastChapterPublishedAt: true,
        },
    });

    if (series.length === 0) return [];

    const seriesIds = series.map((s) => s.id);

    const allChapters = await prisma.chapter.findMany({
        where: { seriesId: { in: seriesIds } },
        select: { seriesId: true, name: true },
    });

    const lastChapterMap = new Map();
    for (const c of allChapters) {
        const current = lastChapterMap.get(c.seriesId);
        if (!current || parseFloat(c.name) > parseFloat(current)) {
            lastChapterMap.set(c.seriesId, c.name);
        }
    }

    const lastReadMap = new Map();
    if (userId) {
        const readDetails = await prisma.userChapterRead.findMany({
            where: {
                userId,
                chapter: { seriesId: { in: seriesIds } },
            },
            select: {
                chapter: { select: { seriesId: true, name: true } },
            },
        });

        for (const r of readDetails) {
            const sid = r.chapter.seriesId;
            const current = lastReadMap.get(sid);
            if (!current || parseFloat(r.chapter.name) > parseFloat(current)) {
                lastReadMap.set(sid, r.chapter.name);
            }
        }
    }

    return series.map((s) => ({
        ...s,
        lastAvailableChapterName: lastChapterMap.get(s.id) ?? null,
        lastReadChapterName: lastReadMap.get(s.id) ?? null,
    }));
}

export async function getSeriesDetailBySlug(slug, page = 1, limit = 100) {
    const series = await prisma.series.findUnique({
        where: { slug },
        include: {
            genres: {
                include: {
                    genre: true,
                },
            },
            providerSeries: {
                include: {
                    provider: true,
                },
            },
        },
    });

    if (!series) return null;

    const totalChapters = await prisma.chapter.count({
        where: { seriesId: series.id },
    });

    const chapters = await prisma.chapter.findMany({
        where: { seriesId: series.id },
        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
    });

    const extractChapterNumber = (name) => {
        if (!name) return 0;
        const match = String(name).match(/(\d+(\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
    };

    return {
        id: series.id,
        name: series.name,
        slug: series.slug,
        cover: series.cover,
        status: series.status,
        type: series.type,
        summary: series.summary,
        chapterCount: series.chapterCount,

        genres: series.genres.map((g) => g.genre.name),

        providers: series.providerSeries.map((p) => ({
            provider: p.provider.name,
            externalSlug: p.slug,
            externalUrl: p.url,
        })),

        chapters: chapters.map((c) => ({
            id: c.id,
            name: c.name,
            publishedAt: c.publishedAt,
            createdAt: c.createdAt,
            chapterNumber: extractChapterNumber(c.name),
        })),

        chaptersMeta: {
            total: totalChapters,
            page,
            limit,
            totalPages: Math.ceil(totalChapters / limit),
        },
    };
}

export async function getChapterPages(slug, chapterId, userId = null) {
    const series = await prisma.series.findUnique({
        where: { slug },
        select: { id: true },
    });

    if (!series) return null;

    const chapter = await prisma.chapter.findFirst({
        where: { id: Number(chapterId), seriesId: series.id },
        include: {
            pages: {
                orderBy: { id: "asc" },
            },
            series: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                },
            },
        },
    });

    if (!chapter) return null;

    // Marcar como leído automáticamente si hay usuario
    if (userId) {
        await markChaptersUntil(userId, chapterId);
    }

    const currentNumber = parseFloat(chapter.name);

    const allChapters = await prisma.chapter.findMany({
        where: { seriesId: chapter.seriesId },
        select: { id: true, name: true },
    });

    const sorted = allChapters.sort(
        (a, b) => parseFloat(a.name) - parseFloat(b.name),
    );

    const currentIndex = sorted.findIndex((c) => c.id === chapter.id);

    const prevChapter = currentIndex > 0 ? sorted[currentIndex - 1] : null;
    const nextChapter =
        currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null;

    return {
        chapterId: chapter.id,
        name: chapter.name,
        publishedAt: chapter.publishedAt,
        series: chapter.series,
        prev: prevChapter
            ? { id: prevChapter.id, name: prevChapter.name }
            : null,
        next: nextChapter
            ? { id: nextChapter.id, name: nextChapter.name }
            : null,
        pages: chapter.pages.map((p) => ({
            id: p.id,
            url: p.url,
        })),
    };
}

export async function getRecommendedSeries(userId, limit = 12) {
    // 1. Top géneros del usuario
    const reads = await prisma.userChapterRead.findMany({
        where: { userId },
        select: {
            chapter: {
                select: {
                    series: {
                        select: {
                            genres: {
                                select: { genre: { select: { name: true } } },
                            },
                        },
                    },
                },
            },
        },
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

    if (topGenres.length === 0) return [];

    // 2. Series que el usuario NO tiene en favoritos
    const favorites = await prisma.userFavorite.findMany({
        where: { userId },
        select: { seriesId: true },
    });
    const favIds = favorites.map((f) => f.seriesId);

    // 3. Series con esos géneros
    const candidates = await prisma.series.findMany({
        where: {
            id: { notIn: favIds.length > 0 ? favIds : [-1] },
            genres: {
                some: {
                    genre: { name: { in: topGenres } },
                },
            },
        },
        select: {
            id: true,
            name: true,
            slug: true,
            cover: true,
            status: true,
            chapterCount: true,
            type: true,
            genres: {
                select: { genre: { select: { name: true } } },
            },
        },
        take: 50,
    });

    // 4. Ordenar por cuántos géneros top coinciden
    const scored = candidates
        .map((s) => {
            const seriesGenres = s.genres.map((g) => g.genre.name);
            const score = topGenres.filter((g) =>
                seriesGenres.includes(g),
            ).length;
            return { ...s, score, genres: seriesGenres };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    return { series: scored, basedOn: topGenres };
}
