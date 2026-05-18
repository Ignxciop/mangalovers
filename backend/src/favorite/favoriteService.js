import { prisma } from "../config/prisma.js";

export async function getUserFavorites(userId) {
    const favorites = await prisma.userFavorite.findMany({
        where: { userId },
        include: {
            series: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    cover: true,
                    status: true,
                    type: true,
                    chapterCount: true,
                    lastChapterPublishedAt: true,
                },
            },
        },
        orderBy: { updatedAt: "desc" },
    });

    if (favorites.length === 0) return [];

    const seriesIds = favorites.map((f) => f.seriesId);

    const readDetails = await prisma.userChapterRead.findMany({
        where: {
            userId,
            chapter: { seriesId: { in: seriesIds } },
        },
        select: {
            chapter: {
                select: { seriesId: true, name: true, publishedAt: true },
            },
        },
    });

    const lastChapters = await prisma.chapter.findMany({
        where: { seriesId: { in: seriesIds } },
        select: { seriesId: true, name: true },
    });

    const lastChapterMap = new Map();
    for (const c of lastChapters) {
        const current = lastChapterMap.get(c.seriesId);
        if (!current || parseFloat(c.name) > parseFloat(current)) {
            lastChapterMap.set(c.seriesId, c.name);
        }
    }

    const seriesReadMap = new Map();
    for (const r of readDetails) {
        const sid = r.chapter.seriesId;
        if (!seriesReadMap.has(sid)) {
            seriesReadMap.set(sid, {
                lastReadChapterName: null,
            });
        }
        const entry = seriesReadMap.get(sid);
        if (
            !entry.lastReadChapterName ||
            parseFloat(r.chapter.name) > parseFloat(entry.lastReadChapterName)
        ) {
            entry.lastReadChapterName = r.chapter.name;
        }
    }

    return favorites.map((f) => ({
        ...f,
        lastReadChapterName:
            seriesReadMap.get(f.seriesId)?.lastReadChapterName ?? null,
        lastAvailableChapterName: lastChapterMap.get(f.seriesId) ?? null,
    }));
}

export async function getFavorite(userId, seriesId) {
    return prisma.userFavorite.findUnique({
        where: { userId_seriesId: { userId, seriesId: Number(seriesId) } },
    });
}

export async function upsertFavorite(userId, seriesId, status) {
    const seriesIdNum = Number(seriesId);

    const series = await prisma.series.findUnique({
        where: { id: seriesIdNum },
        select: { id: true },
    });

    if (!series) {
        const error = new Error("Serie no encontrada");
        error.statusCode = 404;
        throw error;
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
