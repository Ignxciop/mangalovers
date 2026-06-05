import { prisma } from "../../config/prisma.js";
import logger from "../../config/logger.js";
import { normalizeChapterNumber } from "./normalizeChapter.js";

const DRY_RUN = process.argv.includes("--dry-run");

async function run() {
    const provider = await prisma.provider.findUnique({
        where: { name: "leermangaesp" },
    });

    if (!provider) {
        logger.error("Provider leermangaesp no encontrado");
        process.exit(1);
    }

    logger.info({ providerId: provider.id, dryRun: DRY_RUN }, "Migración leermangaesp: cargando capítulos");

    const providerChapters = await prisma.providerChapter.findMany({
        where: { providerId: provider.id },
        select: {
            externalId: true,
            chapter: { select: { id: true, name: true, number: true } },
        },
    });

    logger.info({ count: providerChapters.length }, "Capítulos cargados, calculando diffs");

    const updates = [];
    let noopCount = 0;
    let sample = [];

    for (const pc of providerChapters) {
        if (!pc.chapter) continue;
        const rawNumber = pc.externalId.split("-").slice(1).join("-");
        if (!rawNumber) { noopCount++; continue; }

        const { name: cleanName, number: cleanNumber } = normalizeChapterNumber(rawNumber);
        if (!cleanName) { noopCount++; continue; }

        if (pc.chapter.name === cleanName && pc.chapter.number === cleanNumber) {
            noopCount++;
            continue;
        }

        if (DRY_RUN && sample.length < 5) {
            sample.push({
                chapterId: pc.chapter.id,
                externalId: pc.externalId,
                from: { name: pc.chapter.name, number: pc.chapter.number },
                to: { name: cleanName, number: cleanNumber },
            });
        }

        updates.push({
            id: pc.chapter.id,
            name: cleanName,
            number: cleanNumber,
        });
    }

    logger.info(
        { toUpdate: updates.length, noop: noopCount, dryRun: DRY_RUN },
        "Diffs calculados",
    );

    if (DRY_RUN) {
        for (const s of sample) {
            logger.info(s, "[DRY-RUN] actualizaría");
        }
        await prisma.$disconnect();
        return;
    }

    const BATCH = 1000;
    let done = 0;
    for (let i = 0; i < updates.length; i += BATCH) {
        const batch = updates.slice(i, i + BATCH);
        await prisma.$transaction(
            batch.map((u) =>
                prisma.chapter.update({
                    where: { id: u.id },
                    data: { name: u.name, number: u.number },
                }),
            ),
        );
        done += batch.length;
        logger.info(
            { progress: `${done}/${updates.length}` },
            "Batch actualizado",
        );
    }

    logger.info({ updated: updates.length, noop: noopCount }, "Migración leermangaesp completa");
    await prisma.$disconnect();
}

run().catch(async (err) => {
    logger.error({ err: err.message }, "Error fatal en migración");
    await prisma.$disconnect();
    process.exit(1);
});
