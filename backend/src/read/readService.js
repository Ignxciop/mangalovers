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
