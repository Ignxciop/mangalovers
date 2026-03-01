import { prisma } from "../../config/prisma.js";

function normalize(name) {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // quitar tildes
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

export async function deduplicateSeries() {
    console.log("Buscando duplicados...");

    const olympus = await prisma.provider.findUnique({
        where: { name: "olympus" },
    });
    const manhwaweb = await prisma.provider.findUnique({
        where: { name: "manhwaweb" },
    });

    const olympusSeries = await prisma.providerSeries.findMany({
        where: { providerId: olympus.id },
        include: { series: true },
    });

    const manhwawebSeries = await prisma.providerSeries.findMany({
        where: { providerId: manhwaweb.id },
        include: { series: true },
    });

    const olympusMap = new Map();
    for (const ps of olympusSeries) {
        olympusMap.set(normalize(ps.series.name), ps);
    }

    let merged = 0;

    for (const mwPs of manhwawebSeries) {
        const key = normalize(mwPs.series.name);
        const olympusPs = olympusMap.get(key);

        if (!olympusPs) continue;

        const keepId = olympusPs.seriesId;
        const dropId = mwPs.seriesId;

        if (keepId === dropId) continue;

        console.log(
            `Fusionando: "${mwPs.series.name}" (${dropId} → ${keepId})`,
        );

        await prisma.$transaction(async (tx) => {
            // Migrar capítulos
            const existingChapters = await tx.chapter.findMany({
                where: { seriesId: keepId },
                select: { name: true },
            });
            const existingNames = new Set(existingChapters.map((c) => c.name));

            const chaptersToMigrate = await tx.chapter.findMany({
                where: { seriesId: dropId },
            });

            for (const ch of chaptersToMigrate) {
                if (existingNames.has(ch.name)) {
                    const keepChapter = await tx.chapter.findFirst({
                        where: { seriesId: keepId, name: ch.name },
                    });
                    if (keepChapter) {
                        await tx.providerChapter.updateMany({
                            where: { chapterId: ch.id },
                            data: { chapterId: keepChapter.id },
                        });
                    }
                } else {
                    await tx.chapter.update({
                        where: { id: ch.id },
                        data: { seriesId: keepId },
                    });
                }
            }

            // Migrar favoritos
            await tx.userFavorite.updateMany({
                where: { seriesId: dropId },
                data: { seriesId: keepId },
            });

            // Migrar lecturas
            const readsToMigrate = await tx.userChapterRead.findMany({
                where: { chapter: { seriesId: dropId } },
                select: { id: true, userId: true, chapterId: true },
            });

            for (const read of readsToMigrate) {
                const sourceChapter = await tx.chapter.findUnique({
                    where: { id: read.chapterId },
                    select: { name: true },
                });
                if (!sourceChapter) continue;

                const keepChapter = await tx.chapter.findFirst({
                    where: { seriesId: keepId, name: sourceChapter.name },
                });
                if (keepChapter) {
                    await tx.userChapterRead.upsert({
                        where: {
                            userId_chapterId: {
                                userId: read.userId,
                                chapterId: keepChapter.id,
                            },
                        },
                        create: {
                            userId: read.userId,
                            chapterId: keepChapter.id,
                        },
                        update: {},
                    });
                }
            }

            // Migrar providerSeries — con check de duplicado
            const existingLink = await tx.providerSeries.findUnique({
                where: {
                    providerId_seriesId: {
                        providerId: manhwaweb.id,
                        seriesId: keepId,
                    },
                },
            });

            if (existingLink) {
                await tx.providerSeries.delete({ where: { id: mwPs.id } });
            } else {
                await tx.providerSeries.update({
                    where: { id: mwPs.id },
                    data: { seriesId: keepId },
                });
            }

            // Limpiar serie duplicada
            await tx.page.deleteMany({
                where: { chapter: { seriesId: dropId } },
            });
            await tx.chapter.deleteMany({ where: { seriesId: dropId } });
            await tx.seriesGenre.deleteMany({ where: { seriesId: dropId } });
            await tx.series.delete({ where: { id: dropId } });
        });

        merged++;
    }

    console.log(`Fusión completa — ${merged} series fusionadas`);
}
