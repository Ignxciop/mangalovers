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

    const seriesReadMap = new Map();
    for (const r of readDetails) {
        const sid = r.chapter.seriesId;
        if (!seriesReadMap.has(sid)) {
            seriesReadMap.set(sid, {
                readCount: 0,
                lastReadChapterName: null,
                lastPublishedAt: null,
            });
        }
        const entry = seriesReadMap.get(sid);
        entry.readCount++;
        if (
            !entry.lastPublishedAt ||
            new Date(r.chapter.publishedAt) > new Date(entry.lastPublishedAt)
        ) {
            entry.lastPublishedAt = r.chapter.publishedAt;
            entry.lastReadChapterName = r.chapter.name;
        }
    }

    return favorites.map((f) => ({
        ...f,
        readCount: seriesReadMap.get(f.seriesId)?.readCount ?? 0,
        lastReadChapterName:
            seriesReadMap.get(f.seriesId)?.lastReadChapterName ?? null,
    }));
}

export async function getFavorite(userId, seriesId) {
    return prisma.userFavorite.findUnique({
        where: { userId_seriesId: { userId, seriesId: Number(seriesId) } },
    });
}

export async function upsertFavorite(userId, seriesId, status) {
    return prisma.userFavorite.upsert({
        where: { userId_seriesId: { userId, seriesId: Number(seriesId) } },
        update: { status },
        create: { userId, seriesId: Number(seriesId), status },
    });
}

export async function deleteFavorite(userId, seriesId) {
    return prisma.userFavorite.delete({
        where: { userId_seriesId: { userId, seriesId: Number(seriesId) } },
    });
}
