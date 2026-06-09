import { prisma } from "../../config/prisma.js";

/**
 * Expande recursivamente el cluster vía SeriesRelation.
 */
async function collectClusterIds(seedId) {
    const allIds = new Set([seedId]);
    let prevSize = 0;
    while (allIds.size > prevSize) {
        prevSize = allIds.size;
        const rels = await prisma.seriesRelation.findMany({
            where: {
                OR: [
                    { primarySeriesId: { in: [...allIds] } },
                    { fallbackSeriesId: { in: [...allIds] } },
                ],
            },
            select: { primarySeriesId: true, fallbackSeriesId: true },
        });
        for (const rel of rels) {
            allIds.add(rel.primarySeriesId);
            allIds.add(rel.fallbackSeriesId);
        }
    }
    return [...allIds];
}

export async function updateSeriesMetadata(seriesId) {
    const clusterIds = await collectClusterIds(seriesId);

    const seriesIds = clusterIds;

    const latestChapter = await prisma.chapter.findFirst({
        where: { seriesId: { in: seriesIds } },
        orderBy: { publishedAt: "desc" },
        select: { publishedAt: true },
    });

    const chapterCount = await prisma.chapter.count({
        where: { seriesId: { in: seriesIds } },
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
