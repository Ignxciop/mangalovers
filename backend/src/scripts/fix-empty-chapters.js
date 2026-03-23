import { prisma } from "../config/prisma.js";

async function fixEmptyChapters() {
    console.log("Buscando capítulos sin páginas...");

    const emptyChapters = await prisma.chapter.findMany({
        where: {
            pagesScraped: true,
            pages: { none: {} },
        },
        select: { id: true, name: true, seriesId: true },
    });

    console.log(`${emptyChapters.length} capítulos sin páginas encontrados`);

    if (emptyChapters.length === 0) return;

    await prisma.chapter.updateMany({
        where: {
            id: { in: emptyChapters.map((c) => c.id) },
        },
        data: { pagesScraped: false },
    });

    console.log(
        `${emptyChapters.length} capítulos reseteados — se procesarán en el próximo scrape`,
    );
    await prisma.$disconnect();
}

fixEmptyChapters().catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
});
