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
        select: {
            seriesId: true,
            publishedAt: true,
        },
    });

    if (!target) {
        throw new Error("Chapter not found");
    }

    const chapters = await prisma.chapter.findMany({
        where: {
            seriesId: target.seriesId,
            publishedAt: {
                lte: target.publishedAt,
            },
        },
        select: { id: true },
    });

    if (chapters.length === 0) return { updated: 0 };

    await prisma.userChapterRead.createMany({
        data: chapters.map((c) => ({
            userId,
            chapterId: c.id,
        })),
        skipDuplicates: true,
    });

    return { updated: chapters.length };
}

export async function unmarkChaptersFrom(userId, chapterId) {
    const target = await prisma.chapter.findUnique({
        where: { id: Number(chapterId) },
        select: {
            seriesId: true,
            publishedAt: true,
        },
    });

    if (!target) {
        throw new Error("Chapter not found");
    }

    const chapters = await prisma.chapter.findMany({
        where: {
            seriesId: target.seriesId,
            publishedAt: {
                gte: target.publishedAt,
            },
        },
        select: { id: true },
    });

    await prisma.userChapterRead.deleteMany({
        where: {
            userId,
            chapterId: {
                in: chapters.map((c) => c.id),
            },
        },
    });

    return { updated: chapters.length };
}
