import { prisma } from "../config/prisma.js";

export async function getAllManga(query) {
    const {
        page = 1,
        limit = 24,
        search,
        provider,
        status,
        sort = "updated",
        order = "desc",
    } = query;

    const skip = (page - 1) * limit;

    const where = {};

    if (search) {
        where.name = {
            contains: search,
            mode: "insensitive",
        };
    }

    if (status) {
        where.status = status;
    }

    if (provider) {
        where.providerSeries = {
            some: {
                provider: {
                    name: provider,
                },
            },
        };
    }

    let orderBy = { updatedAt: "desc" };

    if (sort === "name") {
        orderBy = { name: order };
    }

    if (sort === "chapters") {
        orderBy = { chapterCount: order };
    }

    if (sort === "updated") {
        orderBy = { updatedAt: order };
    }

    const [manga, total] = await Promise.all([
        prisma.series.findMany({
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
                providerSeries: {
                    select: {
                        provider: {
                            select: { name: true },
                        },
                    },
                },
            },
        }),
        prisma.series.count({ where }),
    ]);

    return {
        data: manga.map((m) => ({
            id: m.id,
            name: m.name,
            slug: m.slug,
            cover: m.cover,
            status: m.status,
            chapterCount: m.chapterCount,
            updatedAt: m.updatedAt,
            providers: m.providerSeries.map((ps) => ps.provider.name),
        })),
        meta: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
        },
    };
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

    if (!userId || series.length === 0)
        return series.map((s) => ({
            ...s,
            lastReadChapterName: null,
            lastAvailableChapterName: null,
        }));

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

    const readDetails = await prisma.userChapterRead.findMany({
        where: {
            userId,
            chapter: { seriesId: { in: seriesIds } },
        },
        select: {
            chapter: { select: { seriesId: true, name: true } },
        },
    });

    const lastReadMap = new Map();
    for (const r of readDetails) {
        const sid = r.chapter.seriesId;
        const current = lastReadMap.get(sid);
        if (!current || parseFloat(r.chapter.name) > parseFloat(current)) {
            lastReadMap.set(sid, r.chapter.name);
        }
    }

    return series.map((s) => ({
        ...s,
        lastAvailableChapterName: lastChapterMap.get(s.id) ?? null,
        lastReadChapterName: lastReadMap.get(s.id) ?? null,
    }));
}

export async function getSeriesDetailBySlug(slug) {
    const series = await prisma.series.findUnique({
        where: { slug },
        include: {
            genres: {
                include: {
                    genre: true,
                },
            },
            chapters: {
                orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
            },
            providerSeries: {
                include: {
                    provider: true,
                },
            },
        },
    });

    if (!series) return null;

    const sortedAsc = [...series.chapters].sort((a, b) => {
        const dateDiff = new Date(a.publishedAt) - new Date(b.publishedAt);
        if (dateDiff !== 0) return dateDiff;
        return b.id - a.id;
    });

    const numberMap = new Map(sortedAsc.map((c, i) => [c.id, i + 1]));

    return {
        id: series.id,
        name: series.name,
        slug: series.slug,
        cover: series.cover,
        status: series.status,
        summary: series.summary,
        chapterCount: series.chapterCount,

        genres: series.genres.map((g) => g.genre.name),

        providers: series.providerSeries.map((p) => ({
            provider: p.provider.name,
            externalSlug: p.slug,
            externalUrl: p.url,
        })),

        chapters: [...series.chapters]
            .sort((a, b) => parseFloat(b.name) - parseFloat(a.name))
            .map((c, index, arr) => ({
                id: c.id,
                name: c.name,
                publishedAt: c.publishedAt,
                createdAt: c.createdAt,
                chapterNumber: arr.length - index,
            })),
    };
}

export async function getChapterPages(chapterId) {
    const chapter = await prisma.chapter.findUnique({
        where: { id: Number(chapterId) },
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
