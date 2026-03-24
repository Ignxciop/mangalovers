import { prisma } from "../config/prisma.js";

async function fixEmptyChapters() {
    console.log("Buscando capítulos sin páginas...");

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

    console.log(`${emptyChapters.length} capítulos sin páginas encontrados`);

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

    console.log(`${ids.length} capítulos reseteados — listos para re-scrape`);

    await prisma.$disconnect();
}

fixEmptyChapters().catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
});
