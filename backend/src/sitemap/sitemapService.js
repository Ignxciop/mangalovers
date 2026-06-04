import { prisma } from "../config/prisma.js";

export async function getAllSitemapData() {
    const [series, chapters] = await Promise.all([
        prisma.series.findMany({
            where: {
              lastChapterPublishedAt: { not: null },
              fallbackRelations: { none: {} },
            },
            orderBy: { updatedAt: "desc" },
            select: {
                slug: true,
                updatedAt: true,
                lastChapterPublishedAt: true,
            },
        }),
        prisma.chapter.findMany({
            orderBy: { publishedAt: "desc" },
            select: {
                id: true,
                publishedAt: true,
                series: { select: { slug: true } },
            },
        }),
    ]);

    return { series, chapters };
}
