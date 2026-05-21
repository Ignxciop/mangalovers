import { prisma } from "../config/prisma.js";
import logger from "../config/logger.js";
import { updateSeriesMetadata } from "../manga/scrapers/updateSeriesMetadata.js";
import axios from "axios";
import pLimit from "p-limit";

const limit = pLimit(4);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOlympusPage(slug, page, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(
                `https://dashboard.olympusbiblioteca.com/api/series/${slug}/chapters`,
                { params: { page, direction: "desc", type: "comic" }, timeout: 30000 },
            );
            return data;
        } catch (error) {
            if (i === retries - 1) throw error;
            await sleep(2000 * (i + 1));
        }
    }
}

async function processOlympusSeries(providerSeries, providerId) {
    const { slug, seriesId } = providerSeries;

    try {
        const firstPage = await fetchOlympusPage(slug, 1);
        const lastPage = firstPage.meta.last_page;
        let created = 0;

        for (let page = 1; page <= lastPage; page++) {
            const data = page === 1 ? firstPage : await fetchOlympusPage(slug, page);

            for (const ch of data.data) {
                const existing = await prisma.providerChapter.findUnique({
                    where: {
                        providerId_externalId: {
                            providerId,
                            externalId: String(ch.id),
                        },
                    },
                });
                if (existing) continue;

                const existingChapter = await prisma.chapter.findFirst({
                    where: { seriesId, name: ch.name },
                });

                if (existingChapter) {
                    await prisma.providerChapter.create({
                        data: {
                            providerId,
                            externalId: String(ch.id),
                            chapterId: existingChapter.id,
                        },
                    });
                } else {
                    const newChapter = await prisma.chapter.create({
                        data: {
                            name: ch.name,
                            publishedAt: new Date(ch.published_at),
                            seriesId,
                        },
                    });

                    await prisma.providerChapter.create({
                        data: {
                            providerId,
                            externalId: String(ch.id),
                            chapterId: newChapter.id,
                        },
                    });
                }
                created++;
            }

            await sleep(300);
        }

        if (created > 0) {
            await updateSeriesMetadata(seriesId);
            logger.info({ slug, created }, "Backfill olympus: capítulos agregados");
        } else {
            logger.info({ slug }, "Backfill olympus: sin capítulos nuevos");
        }
    } catch (error) {
        logger.error({ slug, err: error.message }, "Backfill olympus: error");
    }
}

async function fetchManhwaWebData(externalId, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(
                `https://manhwawebbackend-production.up.railway.app/manhwa/see/${externalId}`,
                { timeout: 30000 },
            );
            return data;
        } catch (error) {
            if (i === retries - 1) throw error;
            await sleep(2000 * (i + 1));
        }
    }
}

async function processManhwaWebSeries(providerSeries, providerId) {
    const { externalId, seriesId } = providerSeries;
    let created = 0;

    try {
        const data = await fetchManhwaWebData(externalId);
        const chapters = data.chapters ?? [];

        for (const ch of chapters) {
            const chapterExternalId = `${externalId}-${ch.chapter}`;
            const chapterName = String(ch.chapter);

            const existing = await prisma.providerChapter.findUnique({
                where: {
                    providerId_externalId: {
                        providerId,
                        externalId: chapterExternalId,
                    },
                },
            });
            if (existing) continue;

            const existingChapter = await prisma.chapter.findFirst({
                where: { seriesId, name: chapterName },
            });

            if (existingChapter) {
                await prisma.providerChapter.create({
                    data: {
                        providerId,
                        externalId: chapterExternalId,
                        chapterId: existingChapter.id,
                    },
                });
            } else {
                const publishedAt = ch.create ? new Date(ch.create) : new Date();

                const newChapter = await prisma.chapter.create({
                    data: { name: chapterName, publishedAt, seriesId },
                });

                await prisma.providerChapter.create({
                    data: {
                        providerId,
                        externalId: chapterExternalId,
                        chapterId: newChapter.id,
                    },
                });
            }
            created++;
        }

        if (created > 0) {
            await updateSeriesMetadata(seriesId);
            logger.info({ externalId, created }, "Backfill manhwaweb: capítulos agregados");
        } else {
            logger.info({ externalId }, "Backfill manhwaweb: sin capítulos nuevos");
        }
    } catch (error) {
        logger.error({ externalId, err: error.message }, "Backfill manhwaweb: error");
    }
}

async function main() {
    logger.info("=== Backfill: buscando capítulos faltantes ===");

    const olympus = await prisma.provider.findUnique({ where: { name: "olympus" } });
    const manhwaweb = await prisma.provider.findUnique({ where: { name: "manhwaweb" } });

    if (olympus) {
        const seriesList = await prisma.providerSeries.findMany({
            where: { providerId: olympus.id },
            select: { slug: true, seriesId: true },
        });
        logger.info({ total: seriesList.length }, "Backfill olympus: procesando series");
        await Promise.all(
            seriesList.map((ps) => limit(() => processOlympusSeries(ps, olympus.id))),
        );
    }

    if (manhwaweb) {
        const seriesList = await prisma.providerSeries.findMany({
            where: { providerId: manhwaweb.id },
            select: { externalId: true, seriesId: true },
        });
        logger.info({ total: seriesList.length }, "Backfill manhwaweb: procesando series");
        await Promise.all(
            seriesList.map((ps) => limit(() => processManhwaWebSeries(ps, manhwaweb.id))),
        );
    }

    logger.info("=== Backfill completado ===");
    await prisma.$disconnect();
}

main().catch((err) => {
    logger.error({ err: err.message }, "Backfill falló");
    process.exit(1);
});
