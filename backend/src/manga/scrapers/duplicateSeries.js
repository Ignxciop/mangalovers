import { prisma } from "../../config/prisma.js";
import {
    normalizeSeriesName,
    matchManga,
    syncManualAliases,
} from "../scrapers/seriesMatcher.js";

const MANUAL_ALIASES = [
    {
        canonical: "El asesino yu ijin",
        aliases: ["El asesino yu ijin", "Alistamiento mercenario"],
    },
    {
        canonical: "Aragi Kai, el Asesino en el Mundo Paralelo",
        aliases: [
            "Aragi Kai, el Asesino en el Mundo Paralelo",
            "El Asesino mas fuerte es transferido a otro mundo con toda su clase",
        ],
    },
    {
        canonical: "Restaurante del mago",
        aliases: ["Restaurante del mago", "El Restaurante del Archimago"],
    },
    {
        canonical: "El villano de mirada cortante de la Academia Demoniaca",
        aliases: [
            "El villano de mirada cortante de la Academia Demoniaca",
            "El villano de mirada cortante en la Academia Demoniaca",
        ],
    },
    {
        canonical:
            "Me convertí en el villano con el que la heroína está obsesionada",
        aliases: [
            "Me convertí en el villano con el que la heroína está obsesionada",
            "Me convertí en el villano con el que la heroe esta obsesionada",
        ],
    },
    {
        canonical: "El Señor de Hielo",
        aliases: ["El Señor de Hielo", "Señor Del Hielo"],
    },
    {
        canonical: "El Rey Demonio Abrumado por Héroes",
        aliases: [
            "El Rey Demonio Abrumado por Héroes",
            "El rey demonio es superado por los héroes",
        ],
    },
    {
        canonical: "apocalipsis zombie 82 08",
        aliases: ["apocalipsis zombie 82 08", "Apocalipsis Zombi 82-08"],
    },
];

async function mergeSeries(keepId, dropId, manhwawebId) {
    await prisma.$transaction(async (tx) => {
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

        await tx.userFavorite.updateMany({
            where: { seriesId: dropId },
            data: { seriesId: keepId },
        });

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
                    create: { userId: read.userId, chapterId: keepChapter.id },
                    update: {},
                });
            }
        }

        const mwPs = await tx.providerSeries.findFirst({
            where: { providerId: manhwawebId, seriesId: dropId },
        });

        if (mwPs) {
            const existingLink = await tx.providerSeries.findUnique({
                where: {
                    providerId_seriesId: {
                        providerId: manhwawebId,
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
        }

        await tx.page.deleteMany({ where: { chapter: { seriesId: dropId } } });
        await tx.chapter.deleteMany({ where: { seriesId: dropId } });
        await tx.seriesGenre.deleteMany({ where: { seriesId: dropId } });
        await tx.series.delete({ where: { id: dropId } });
    });
}

export async function deduplicateSeries() {
    console.log("Deduplicacion de series");

    const olympus = await prisma.provider.findUnique({
        where: { name: "olympus" },
    });
    const manhwaweb = await prisma.provider.findUnique({
        where: { name: "manhwaweb" },
    });

    await syncManualAliases(MANUAL_ALIASES, "olympus");

    const olympusSeries = await prisma.providerSeries.findMany({
        where: { providerId: olympus.id },
        include: { series: true },
    });

    const manhwawebSeries = await prisma.providerSeries.findMany({
        where: { providerId: manhwaweb.id },
        include: { series: true },
    });

    const olympusByNormalized = new Map();
    const olympusByAlias = new Map();

    const allAliases = await prisma.seriesAlias.findMany({
        select: { alias: true, seriesId: true },
    });
    for (const a of allAliases) {
        olympusByAlias.set(a.alias, a.seriesId);
    }

    for (const ps of olympusSeries) {
        olympusByNormalized.set(normalizeSeriesName(ps.series.name), ps);
    }

    let merged = 0;
    let skipped = 0;

    for (const mwPs of manhwawebSeries) {
        const alreadyLinked = olympusSeries.some(
            (ops) => ops.seriesId === mwPs.seriesId,
        );
        if (alreadyLinked) continue;

        const mwName = mwPs.series.name;
        let keepPs = null;
        let method = null;

        const aliasSeriesId = olympusByAlias.get(mwName.toLowerCase());
        if (aliasSeriesId) {
            keepPs = olympusSeries.find((ps) => ps.seriesId === aliasSeriesId);
            method = "alias";
        }

        if (!keepPs) {
            keepPs = olympusByNormalized.get(normalizeSeriesName(mwName));
            if (keepPs) method = "normalized_exact";
        }

        if (!keepPs) {
            let bestScore = 0;
            for (const ops of olympusSeries) {
                const result = matchManga(mwName, ops.series.name);
                if (result.decision === "merge" && result.score > bestScore) {
                    bestScore = result.score;
                    keepPs = ops;
                    method = `token_match (${(result.score * 100).toFixed(0)}%)`;
                }
            }
        }

        if (!keepPs) {
            skipped++;
            continue;
        }

        const keepId = keepPs.seriesId;
        const dropId = mwPs.seriesId;

        if (keepId === dropId) continue;

        console.log(
            `Fusionando [${method}]: "${mwName}" -> "${keepPs.series.name}" (${dropId} -> ${keepId})`,
        );

        await mergeSeries(keepId, dropId, manhwaweb.id);
        merged++;
    }

    console.log(`Listo — ${merged} fusionadas, ${skipped} sin match`);
}
