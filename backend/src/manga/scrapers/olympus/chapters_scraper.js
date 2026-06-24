import axios from "axios";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";
import logger from "../../../config/logger.js";
import { updateSeriesMetadata } from "../updateSeriesMetadata.js";
import { getAbortSignal } from "../scraperAbort.js";
import { promoteStatusIfInactive } from "../resolveStatus.js";

const limit = pLimit(4);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchChapters(slug, page, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(
                `https://panel.olympusxyz.com/api/series/${slug}/chapters`,
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

    if (getAbortSignal("olympus").aborted) return;

    logger.info({ slug }, "Revisando capítulos olympus");

    let latestCreatedChapter = null;
    const MAX_CONSECUTIVE_EXISTING = 10;
    let consecutiveExisting = 0;

    try {
        const firstPage = await fetchChapters(slug, 1);
        const lastPage = firstPage.meta.last_page;

        for (let page = 1; page <= lastPage; page++) {
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
                    consecutiveExisting++;
                    if (consecutiveExisting >= MAX_CONSECUTIVE_EXISTING) {
                        logger.debug(
                            { slug, count: consecutiveExisting },
                            "Capítulos existentes consecutivos, stop",
                        );
                        break;
                    }
                    continue;
                }

                consecutiveExisting = 0;

                const chapterNumber = (() => {
                    const m = ch.name?.match(/(\d+(?:\.\d+)?)/);
                    return m ? parseFloat(m[0]) : null;
                })();

                const existingChapter = await prisma.chapter.findFirst({
                    where: {
                        seriesId,
                        OR: [
                            { name: ch.name },
                            ...(chapterNumber !== null ? [{ number: chapterNumber }] : []),
                        ],
                    },
                });

                if (existingChapter) {
                    await prisma.providerChapter.create({
                        data: {
                            providerId,
                            externalId: String(ch.id),
                            chapterId: existingChapter.id,
                        },
                    });
                    latestCreatedChapter = existingChapter;
                    logger.debug(
                        { chapterName: ch.name, slug },
                        "Capítulo existente vinculado olympus",
                    );
                    continue;
                }

                const newChapter = await prisma.chapter.create({
                    data: {
                        name: ch.name,
                        number: chapterNumber,
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

            if (consecutiveExisting >= MAX_CONSECUTIVE_EXISTING) break;

            await sleep(300);
        }

        await updateSeriesMetadata(seriesId);
        await promoteStatusIfInactive(seriesId, !!latestCreatedChapter);
    } catch (error) {
        logger.error({ slug, err: error.message }, "Error procesando serie olympus");
    }
}

export async function processSeriesChapters(providerSeries, providerId) {
    return processSeries(providerSeries, providerId);
}

export async function scrapeChapters() {
    logger.info("Capítulos incremental...");

    const provider = await prisma.provider.findUnique({
        where: { name: "olympus" },
    });

    const providerSeriesList = await prisma.providerSeries.findMany({
        where: {
            providerId: provider.id,
            enabled: true,
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

    if (getAbortSignal("olympus").aborted) return;

    await Promise.all(
        providerSeriesList.map((ps) =>
            limit(() => processSeries(ps, provider.id)),
        ),
    );

    logger.info("Capítulos listos");
}
