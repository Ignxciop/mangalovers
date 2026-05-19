import { prisma } from "../config/prisma.js";
import logger from "../config/logger.js";

async function fixEmptyChapters() {
    logger.info("Buscando capítulos sin páginas...");

    const emptyChapters = await prisma.chapter.findMany({
        where: {
            pages: {
                none: {},
            },
        },
        select: {
            id: true,
            name: true,
            pagesScraped: true,
        },
    });

    logger.info({ count: emptyChapters.length }, "Capítulos sin páginas encontrados");

    if (emptyChapters.length === 0) return;

    const ids = emptyChapters.map((c) => c.id);

    await prisma.chapter.updateMany({
        where: {
            id: { in: ids },
        },
        data: {
            pagesScraped: false,
        },
    });

    logger.info({ count: ids.length }, "Capítulos reseteados — listos para re-scrape");

    await prisma.$disconnect();
}

fixEmptyChapters().catch((e) => {
    logger.error({ err: e }, "Error en fixEmptyChapters");
    prisma.$disconnect();
    process.exit(1);
});
