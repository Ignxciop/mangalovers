/**
 * Script único: recalcula lastChapterPublishedAt y chapterCount
 * para TODAS las series que son primary de al menos una relación.
 *
 * Útil después de deployar el fix cluster-aware de updateSeriesMetadata,
 * para que las relaciones existentes reflejen los capítulos de sus fallbacks.
 *
 * Uso: pnpm exec node src/scripts/refresh-cluster-metadata.js
 */
import { prisma } from "../config/prisma.js";
import logger from "../config/logger.js";

async function refreshAll() {
    logger.info("Iniciando refresh de metadata de clusters existentes...");

    const relations = await prisma.seriesRelation.findMany({
        select: { primarySeriesId: true },
        distinct: ["primarySeriesId"],
    });

    const primaryIds = relations.map((r) => r.primarySeriesId);
    logger.info({ count: primaryIds.length }, "Series primarias encontradas");

    for (const id of primaryIds) {
        const clusterIds = await collectClusterIds(id);

        const latestChapter = await prisma.chapter.findFirst({
            where: { seriesId: { in: clusterIds } },
            orderBy: { publishedAt: "desc" },
            select: { publishedAt: true },
        });

        const counts = await prisma.chapter.groupBy({
            by: ["seriesId"],
            where: { seriesId: { in: clusterIds } },
            _count: { id: true },
        });
        const countMap = new Map(counts.map((c) => [c.seriesId, c._count.id]));

        await prisma.$transaction(
            clusterIds.map((sid) =>
                prisma.series.update({
                    where: { id: sid },
                    data: {
                        lastChaptersCheck: new Date(),
                        lastChapterPublishedAt: latestChapter?.publishedAt ?? null,
                        chapterCount: countMap.get(sid) ?? 0,
                    },
                }),
            ),
        );

        const totalChapters = [...countMap.values()].reduce((a, b) => a + b, 0);
        logger.info(
            { primaryId: id, clusterSize: clusterIds.length, totalChapters, lastPublish: latestChapter?.publishedAt },
            "Cluster actualizado",
        );
    }

    logger.info("Refresh completado");
}

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

refreshAll()
    .catch((err) => {
        console.error("Error:", err);
        process.exit(1);
    })
    .then(() => {
        prisma.$disconnect();
        process.exit(0);
    });
