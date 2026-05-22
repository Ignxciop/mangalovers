import axios from "axios";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";
import logger from "../../../config/logger.js";
import { notifyNewChapter } from "../../../notifications/notificationService.js";
import { updateSeriesMetadata } from "../updateSeriesMetadata.js";

const limit = pLimit(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BASE_URL = "https://manhwawebbackend-production.up.railway.app";

async function fetchSeriesWithChapters(externalId, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(
                `${BASE_URL}/manhwa/see/${externalId}`,
                { timeout: 30000 },
            );
            return data;
        } catch (error) {
            if (i === retries - 1) throw error;
            logger.warn({ externalId, attempt: i + 2 }, "Reintentando fetch manhwaweb");
            await sleep(2000 * (i + 1));
        }
    }
}

async function processSeries(providerSeries, providerId) {
    const externalId = providerSeries.externalId;
    const seriesId = providerSeries.seriesId;

    logger.info({ externalId }, "Revisando capítulos manhwaweb");

    let latestCreatedChapter = null;
    const MAX_CONSECUTIVE_EXISTING = 10;
    let consecutiveExisting = 0;

    try {
        const data = await fetchSeriesWithChapters(externalId);
        const chapters = (data.chapters ?? []).slice().reverse();

        for (const ch of chapters) {
            const chapterExternalId = `${externalId}-${ch.chapter}`;
            const chapterName = String(ch.chapter);

            const existingProviderChapter =
                await prisma.providerChapter.findUnique({
                    where: {
                        providerId_externalId: {
                            providerId,
                            externalId: chapterExternalId,
                        },
                    },
                });

            if (existingProviderChapter) {
                consecutiveExisting++;
                if (consecutiveExisting >= MAX_CONSECUTIVE_EXISTING) {
                    logger.debug(
                        { externalId, count: consecutiveExisting },
                        "Capítulos existentes consecutivos, stop",
                    );
                    break;
                }
                continue;
            }

            consecutiveExisting = 0;

            const existingChapterInSeries = await prisma.chapter.findFirst({
                where: { seriesId, name: chapterName },
            });

            if (existingChapterInSeries) {
                await prisma.providerChapter.create({
                    data: {
                        providerId,
                        externalId: chapterExternalId,
                        chapterId: existingChapterInSeries.id,
                    },
                });
                latestCreatedChapter = existingChapterInSeries;
                continue;
            }

            const publishedAt = ch.create ? new Date(ch.create) : new Date();

            const newChapter = await prisma.chapter.create({
                data: { name: chapterName, publishedAt, seriesId },
            });

            latestCreatedChapter = newChapter;

            await prisma.providerChapter.create({
                data: {
                    providerId,
                    externalId: chapterExternalId,
                    chapterId: newChapter.id,
                },
            });

            logger.debug({ chapterName, externalId }, "Capítulo nuevo manhwaweb");
        }

        await updateSeriesMetadata(seriesId);

        if (latestCreatedChapter) {
            const series = await prisma.series.findUnique({
                where: { id: seriesId },
                select: { name: true, slug: true },
            });

            await notifyNewChapter({
                seriesId,
                seriesName: series?.name ?? externalId,
                chapterName: latestCreatedChapter.name,
                slug: series?.slug ?? externalId,
            });
        }
    } catch (error) {
        logger.error({ externalId, err: error.message }, "Error capítulos manhwaweb");
    }
}

export async function scrapeChapters() {
    logger.info("ManhwaWeb - Capítulos incremental...");

    const provider = await prisma.provider.findUnique({
        where: { name: "manhwaweb" },
    });

    const providerSeriesList = await prisma.providerSeries.findMany({
        where: {
            providerId: provider.id,
            OR: [
                { series: { lastChaptersCheck: null } },
                {
                    series: {
                        lastChaptersCheck: {
                            lt: new Date(Date.now() - 1000 * 60 * 60),
                        },
                    },
                },
            ],
        },
        select: {
            id: true,
            externalId: true,
            seriesId: true,
        },
    });

    await Promise.all(
        providerSeriesList.map((ps) =>
            limit(() => processSeries(ps, provider.id)),
        ),
    );

    logger.info("ManhwaWeb - Capítulos listos");
}
