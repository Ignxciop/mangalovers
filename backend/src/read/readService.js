import { prisma } from "../config/prisma.js";

export async function getReadChapterIds(userId, seriesId) {
    const reads = await prisma.userChapterRead.findMany({
        where: {
            userId,
            chapter: { seriesId: Number(seriesId) },
        },
        select: { chapterId: true },
    });
    return reads.map((r) => r.chapterId);
}

export const toggleChapterRead = async (userId, chapterId) => {
    const existing = await prisma.userChapterRead.findUnique({
        where: {
            userId_chapterId: {
                userId,
                chapterId,
            },
        },
    });
    if (existing) {
        return await unmarkChaptersFrom(userId, chapterId);
    }
    return await markChaptersUntil(userId, chapterId);
};

export async function markChaptersUntil(userId, chapterId) {
    const target = await prisma.chapter.findUnique({
        where: { id: Number(chapterId) },
        select: { seriesId: true, name: true },
    });

    if (!target) throw new Error("Chapter not found");

    const targetNumber = parseFloat(target.name);

    const allChapters = await prisma.chapter.findMany({
        where: { seriesId: target.seriesId },
        select: { id: true, name: true },
    });

    const chapters = allChapters.filter(
        (c) => parseFloat(c.name) <= targetNumber,
    );

    if (chapters.length === 0) return { updated: 0 };

    await prisma.userChapterRead.createMany({
        data: chapters.map((c) => ({ userId, chapterId: c.id })),
        skipDuplicates: true,
    });

    return { updated: chapters.length };
}

export async function unmarkChaptersFrom(userId, chapterId) {
    const target = await prisma.chapter.findUnique({
        where: { id: Number(chapterId) },
        select: { seriesId: true, name: true },
    });

    if (!target) throw new Error("Chapter not found");

    const targetNumber = parseFloat(target.name);

    const allChapters = await prisma.chapter.findMany({
        where: { seriesId: target.seriesId },
        select: { id: true, name: true },
    });

    const chapters = allChapters.filter(
        (c) => parseFloat(c.name) >= targetNumber,
    );

    await prisma.userChapterRead.deleteMany({
        where: {
            userId,
            chapterId: { in: chapters.map((c) => c.id) },
        },
    });

    return { updated: chapters.length };
}

export async function getUserReadingStats(userId) {
    const totalChaptersRead = await prisma.userChapterRead.count({
        where: { userId },
    });

    const favorites = await prisma.userFavorite.findMany({
        where: { userId },
        include: {
            series: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    cover: true,
                    chapterCount: true,
                    status: true,
                    chapters: {
                        select: { id: true, name: true },
                    },
                },
            },
        },
        orderBy: { updatedAt: "desc" },
    });

    if (favorites.length === 0) {
        return {
            totalChaptersRead,
            totalSeries: 0,
            completedSeries: 0,
            completionPercent: 0,
            estimatedHours: Math.round((totalChaptersRead * 7) / 60),
            continueReading: [],
        };
    }

    const seriesIds = favorites.map((f) => f.seriesId);

    const readDetails = await prisma.userChapterRead.findMany({
        where: { userId, chapter: { seriesId: { in: seriesIds } } },
        select: {
            createdAt: true,
            chapter: { select: { seriesId: true, name: true, id: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    // Último capítulo leído por serie
    const lastReadMap = new Map();
    const lastReadDateMap = new Map();
    for (const r of readDetails) {
        const sid = r.chapter.seriesId;
        if (!lastReadMap.has(sid)) {
            lastReadMap.set(sid, r.chapter.name);
            lastReadDateMap.set(sid, r.createdAt);
        }
    }

    // Último capítulo disponible por serie
    const lastAvailableMap = new Map();
    for (const fav of favorites) {
        const chapters = fav.series.chapters;
        if (chapters.length === 0) continue;
        const last = chapters.reduce((a, b) =>
            parseFloat(a.name) > parseFloat(b.name) ? a : b,
        );
        lastAvailableMap.set(fav.seriesId, last.name);
    }

    // Series completadas (leído hasta el último capítulo)
    let completedSeries = 0;
    for (const fav of favorites) {
        const lastRead = parseFloat(lastReadMap.get(fav.seriesId) ?? "-1");
        const lastAvail = parseFloat(lastAvailableMap.get(fav.seriesId) ?? "0");
        if (lastRead >= lastAvail && lastAvail > 0) completedSeries++;
    }

    // % promedio de finalización
    let totalPercent = 0;
    let seriesWithProgress = 0;
    for (const fav of favorites) {
        const lastRead = parseFloat(lastReadMap.get(fav.seriesId) ?? "0");
        const lastAvail = parseFloat(lastAvailableMap.get(fav.seriesId) ?? "0");
        if (lastAvail > 0) {
            totalPercent += Math.min((lastRead / lastAvail) * 100, 100);
            seriesWithProgress++;
        }
    }
    const completionPercent =
        seriesWithProgress > 0
            ? Math.round(totalPercent / seriesWithProgress)
            : 0;

    // Continuar leyendo — series con progreso, ordenadas por última lectura
    const continueReading = favorites
        .filter((fav) => lastReadMap.has(fav.seriesId))
        .sort((a, b) => {
            const dateA = lastReadDateMap.get(a.seriesId) ?? new Date(0);
            const dateB = lastReadDateMap.get(b.seriesId) ?? new Date(0);
            return new Date(dateB) - new Date(dateA);
        })
        .slice(0, 5)
        .map((fav) => {
            const lastRead = lastReadMap.get(fav.seriesId) ?? null;
            const lastAvail = lastAvailableMap.get(fav.seriesId) ?? null;
            const chaptersLeft =
                lastRead && lastAvail
                    ? Math.max(0, parseFloat(lastAvail) - parseFloat(lastRead))
                    : null;
            return {
                id: fav.series.id,
                name: fav.series.name,
                slug: fav.series.slug,
                cover: fav.series.cover,
                lastReadChapterName: lastRead,
                lastAvailableChapterName: lastAvail,
                chaptersLeft,
            };
        });

    return {
        totalChaptersRead,
        totalSeries: favorites.length,
        completedSeries,
        completionPercent,
        estimatedHours: Math.round((totalChaptersRead * 7) / 60),
        continueReading,
    };
}
