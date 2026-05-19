import axios from "axios";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";
import logger from "../../../config/logger.js";
import { notifyNewChapter } from "../../../notifications/notificationService.js";
import { updateSeriesMetadata } from "../updateSeriesMetadata.js";

const limit = pLimit(4);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchChapters(slug, page, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(
                `https://dashboard.olympusbiblioteca.com/api/series/${slug}/chapters`,
                {
                    params: { page, direction: "desc", type: "comic" },
                    timeout: 30000,
                },
            );
            return data;
        } catch (error) {
            if (i === retries - 1) throw error;
            logger.warn({ slug, page, attempt: i + 2 }, "Reintentando capítulos olympus");
            await sleep(2000 * (i + 1));
        }
    }
}

async function processSeries(providerSeries, providerId) {
    const slug = providerSeries.slug;
    const seriesId = providerSeries.seriesId;

    logger.info({ slug }, "Revisando capítulos olympus");

    let latestCreatedChapter = null;
    let shouldStop = false;

    try {
        const firstPage = await fetchChapters(slug, 1);
        const lastPage = firstPage.meta.last_page;

        for (let page = 1; page <= lastPage && !shouldStop; page++) {
            const data =
                page === 1 ? firstPage : await fetchChapters(slug, page);

            for (const ch of data.data) {
                const existingProviderChapter =
                    await prisma.providerChapter.findUnique({
                        where: {
                            providerId_externalId: {
                                providerId,
                                externalId: String(ch.id),
                            },
                        },
                    });

                if (existingProviderChapter) {
                    logger.debug({ slug }, "Capítulo existente encontrado, stop");
                    shouldStop = true;
                    break;
                }

                const newChapter = await prisma.chapter.create({
                    data: {
                        name: ch.name,
                        publishedAt: new Date(ch.published_at),
                        seriesId,
                    },
                });

                latestCreatedChapter = newChapter;

                await prisma.providerChapter.create({
                    data: {
                        providerId,
                        externalId: String(ch.id),
                        chapterId: newChapter.id,
                    },
                });

                logger.debug({ chapterName: ch.name, slug }, "Capítulo nuevo olympus");
            }

            await sleep(300);
        }

        await updateSeriesMetadata(seriesId);

        // NOTIFICAR SOLO UNA VEZ Y AL FINAL
        if (latestCreatedChapter) {
            const series = await prisma.series.findUnique({
                where: { id: seriesId },
                select: { name: true },
            });

            await notifyNewChapter({
                seriesId,
                seriesName: series?.name ?? slug,
                chapterName: latestCreatedChapter.name,
                slug,
            });
        }
    } catch (error) {
        logger.error({ slug, err: error.message }, "Error procesando serie olympus");
    }
}

export async function scrapeChapters() {
    logger.info("Capítulos incremental...");

    const provider = await prisma.provider.findUnique({
        where: { name: "olympus" },
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
            slug: true,
            seriesId: true,
        },
    });

    await Promise.all(
        providerSeriesList.map((ps) =>
            limit(() => processSeries(ps, provider.id)),
        ),
    );

    logger.info("Capítulos listos");
}
