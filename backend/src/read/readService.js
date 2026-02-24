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

export async function toggleChapterRead(userId, chapterId) {
    const existing = await prisma.userChapterRead.findUnique({
        where: { userId_chapterId: { userId, chapterId: Number(chapterId) } },
    });

    if (existing) {
        await prisma.userChapterRead.delete({
            where: {
                userId_chapterId: { userId, chapterId: Number(chapterId) },
            },
        });
        return { read: false };
    }

    await prisma.userChapterRead.create({
        data: { userId, chapterId: Number(chapterId) },
    });
    return { read: true };
}

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
