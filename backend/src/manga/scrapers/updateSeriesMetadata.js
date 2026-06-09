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

    const latestChapter = await prisma.chapter.findFirst({
        where: { seriesId: { in: clusterIds } },
        orderBy: { publishedAt: "desc" },
        select: { publishedAt: true },
    });

    // Contar capítulos por serie individualmente (no cluster-wide)
    // para evitar que chapterCount sume capítulos de otros providers
    const counts = await prisma.chapter.groupBy({
        by: ["seriesId"],
        where: { seriesId: { in: clusterIds } },
        _count: { id: true },
    });
    const countMap = new Map(counts.map((c) => [c.seriesId, c._count.id]));

    await prisma.$transaction(
        clusterIds.map((id) =>
            prisma.series.update({
                where: { id },
                data: {
                    lastChaptersCheck: new Date(),
                    lastChapterPublishedAt: latestChapter?.publishedAt ?? null,
                    chapterCount: countMap.get(id) ?? 0,
                },
            }),
        ),
    );
}
