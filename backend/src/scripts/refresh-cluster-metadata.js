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

        const chapterCount = await prisma.chapter.count({
            where: { seriesId: { in: clusterIds } },
        });

        await prisma.series.updateMany({
            where: { id: { in: clusterIds } },
            data: {
                lastChaptersCheck: new Date(),
                lastChapterPublishedAt: latestChapter?.publishedAt ?? null,
                chapterCount,
            },
        });

        logger.info(
            { primaryId: id, clusterSize: clusterIds.length, chapterCount, lastPublish: latestChapter?.publishedAt },
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
