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

export async function getLatestManga(limit = 16) {
    return prisma.series.findMany({
        where: {
            lastChapterPublishedAt: {
                not: null,
            },
        },
        orderBy: {
            lastChapterPublishedAt: "desc",
        },
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

        chapters: series.chapters.map((c, index, arr) => ({
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

    const [prev, next] = await Promise.all([
        prisma.chapter.findFirst({
            where: {
                seriesId: chapter.seriesId,
                publishedAt: { gt: chapter.publishedAt },
            },
            orderBy: { publishedAt: "asc" },
            select: { id: true, name: true },
        }),
        prisma.chapter.findFirst({
            where: {
                seriesId: chapter.seriesId,
                publishedAt: { lt: chapter.publishedAt },
            },
            orderBy: { publishedAt: "desc" },
            select: { id: true, name: true },
        }),
    ]);

    return {
        chapterId: chapter.id,
        name: chapter.name,
        publishedAt: chapter.publishedAt,
        series: chapter.series,
        prev: next ? { id: next.id, name: next.name } : null,
        next: prev ? { id: prev.id, name: prev.name } : null,
        pages: chapter.pages.map((p) => ({
            id: p.id,
            url: p.url,
        })),
    };
}
