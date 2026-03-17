import { prisma } from "../config/prisma.js";

async function deduplicateChapters() {
    console.log("Buscando capítulos duplicados...");

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

    console.log(`Series con ambos providers: ${sharedSeries.length}`);

    let totalMerged = 0;
    let totalRemoved = 0;

    for (const series of sharedSeries) {
        console.log(`\nProcesando: "${series.name}" (id: ${series.id})`);

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
                console.log(`  ⚠ Cap ${name}: sin olympus, saltando`);
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

                console.log(
                    `  ✓ Cap ${name}: duplicado eliminado (id: ${dup.id} → ${olympusChapter.id})`,
                );
                totalMerged++;
            }

            totalRemoved += duplicates.length;
        }
    }

    console.log(
        `\nListo — ${totalMerged} capítulos fusionados, ${totalRemoved} duplicados eliminados`,
    );
    await prisma.$disconnect();
}

deduplicateChapters().catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
});
