import { prisma } from "../../config/prisma.js";

export async function updateSeriesMetadata(seriesId) {
    const latestChapter = await prisma.chapter.findFirst({
        where: { seriesId },
        orderBy: { publishedAt: "desc" },
        select: { publishedAt: true },
    });

    const chapterCount = await prisma.chapter.count({
        where: { seriesId },
    });

    await prisma.series.update({
        where: { id: seriesId },
        data: {
            lastChaptersCheck: new Date(),
            lastChapterPublishedAt: latestChapter?.publishedAt ?? null,
            chapterCount,
        },
    });
}
