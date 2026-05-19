import { prisma } from "../config/prisma.js";
import logger from "../config/logger.js";

async function deduplicateChapters() {
    logger.info("Buscando capítulos duplicados...");

    const olympus = await prisma.provider.findUnique({
        where: { name: "olympus" },
    });
    const manhwaweb = await prisma.provider.findUnique({
        where: { name: "manhwaweb" },
    });

    // Series que tienen ambos providers vinculados
    const sharedSeries = await prisma.series.findMany({
        where: {
            providerSeries: {
                some: { providerId: olympus.id },
            },
            AND: {
                providerSeries: {
                    some: { providerId: manhwaweb.id },
                },
            },
        },
        select: { id: true, name: true },
    });

    logger.info({ count: sharedSeries.length }, "Series con ambos providers");

    let totalMerged = 0;
    let totalRemoved = 0;

    for (const series of sharedSeries) {
        logger.info({ name: series.name, id: series.id }, "Procesando serie");

        const allChapters = await prisma.chapter.findMany({
            where: { seriesId: series.id },
            include: {
                providerChapters: {
                    include: { provider: true },
                },
            },
        });

        // Agrupar capítulos por nombre
        const byName = new Map();
        for (const ch of allChapters) {
            const name = ch.name;
            if (!byName.has(name)) byName.set(name, []);
            byName.get(name).push(ch);
        }

        for (const [name, chapters] of byName) {
            if (chapters.length <= 1) continue;

            // Encontrar el capítulo de olympus (keeper)
            const olympusChapter = chapters.find((ch) =>
                ch.providerChapters.some((pc) => pc.providerId === olympus.id),
            );

            if (!olympusChapter) {
                logger.warn({ name }, "Sin olympus, saltando");
                continue;
            }

            const duplicates = chapters.filter(
                (ch) => ch.id !== olympusChapter.id,
            );

            for (const dup of duplicates) {
                await prisma.$transaction(async (tx) => {
                    // Migrar providerChapters del duplicado al olympus chapter
                    for (const pc of dup.providerChapters) {
                        if (pc.providerId === olympus.id) continue; // ya está en keeper

                        const existsInKeeper =
                            await tx.providerChapter.findUnique({
                                where: {
                                    providerId_externalId: {
                                        providerId: pc.providerId,
                                        externalId: pc.externalId,
                                    },
                                },
                            });

                        if (!existsInKeeper) {
                            await tx.providerChapter.update({
                                where: { id: pc.id },
                                data: { chapterId: olympusChapter.id },
                            });
                        } else {
                            await tx.providerChapter.delete({
                                where: { id: pc.id },
                            });
                        }
                    }

                    // Migrar lecturas al capítulo de olympus
                    const reads = await tx.userChapterRead.findMany({
                        where: { chapterId: dup.id },
                        select: { userId: true },
                    });

                    for (const read of reads) {
                        await tx.userChapterRead.upsert({
                            where: {
                                userId_chapterId: {
                                    userId: read.userId,
                                    chapterId: olympusChapter.id,
                                },
                            },
                            create: {
                                userId: read.userId,
                                chapterId: olympusChapter.id,
                            },
                            update: {},
                        });
                    }

                    // Eliminar páginas y capítulo duplicado
                    await tx.page.deleteMany({ where: { chapterId: dup.id } });
                    await tx.userChapterRead.deleteMany({
                        where: { chapterId: dup.id },
                    });
                    await tx.chapter.delete({ where: { id: dup.id } });
                });

                logger.info({ name, dupId: dup.id, keepId: olympusChapter.id }, "Capítulo duplicado eliminado");
                totalMerged++;
            }

            totalRemoved += duplicates.length;
        }
    }

    logger.info({ merged: totalMerged, removed: totalRemoved }, "Deduplicación de capítulos completada");
    await prisma.$disconnect();
}

deduplicateChapters().catch((e) => {
    logger.error({ err: e }, "Error en deduplicación de capítulos");
    prisma.$disconnect();
    process.exit(1);
});
