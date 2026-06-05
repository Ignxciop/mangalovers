import axios from "axios";
import * as cheerio from "cheerio";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";
import logger from "../../../config/logger.js";
import { notifyNewChapter } from "../../../notifications/pushService.js";
import { updateSeriesMetadata } from "../updateSeriesMetadata.js";
import { promoteStatusIfInactive } from "../resolveStatus.js";

const limit = pLimit(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BASE_URL = "https://leermangaesp.net";

async function fetchDetailHTML(originalSlug, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(
                `${BASE_URL}/manga/${originalSlug}/`,
                { timeout: 30000 },
            );
            return data;
        } catch (error) {
            if (i === retries - 1) throw error;
            logger.warn({ originalSlug, attempt: i + 2 }, "Reintentando detalle leermangaesp");
            await sleep(2000 * (i + 1));
        }
    }
}

async function processSeries(providerSeries, providerId) {
    const originalSlug = providerSeries.url;
    const externalId = providerSeries.externalId;
    const seriesId = providerSeries.seriesId;

    logger.info({ originalSlug }, "Revisando capítulos leermangaesp");

    let latestCreatedChapter = null;
    const MAX_CONSECUTIVE_EXISTING = 10;
    let consecutiveExisting = 0;

    try {
        const html = await fetchDetailHTML(originalSlug);
        const $ = cheerio.load(html);

        const chapters = [];
        $("#chapter-list .chapter-link").each((_, el) => {
            const $el = $(el);
            const chapterNumber = $el.attr("data-chapter");
            const displayNumber = chapterNumber.replace(/\.0+$/, "");
            const chapterName = $el.find(".chapter-title").text().trim();
            const chapterDate = $el.find(".chapter-date").text().trim();
            const href = $el.attr("href");

            if (chapterNumber) {
                chapters.push({
                    number: chapterNumber,
                    name: chapterName || `Capítulo ${displayNumber}`,
                    date: chapterDate || null,
                    href: href || null,
                });
            }
        });

        for (const ch of chapters) {
            const chapterExternalId = `${externalId}-${ch.number}`;

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

            const chapterNumberFloat = parseFloat(ch.number);
            const existingChapterInSeries = await prisma.chapter.findFirst({
                where: {
                    seriesId,
                    OR: [
                        { name: ch.name },
                        ...(!isNaN(chapterNumberFloat) ? [{ number: chapterNumberFloat }] : []),
                    ],
                },
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

            const publishedAt = ch.date ? new Date(ch.date) : new Date();

            const newChapter = await prisma.chapter.create({
                data: {
                    name: ch.name,
                    number: chapterNumberFloat,
                    publishedAt,
                    seriesId,
                },
            });

            latestCreatedChapter = newChapter;

            await prisma.providerChapter.create({
                data: {
                    providerId,
                    externalId: chapterExternalId,
                    chapterId: newChapter.id,
                },
            });

            logger.debug({ chapterName: ch.name, externalId }, "Capítulo nuevo leermangaesp");
        }

        await updateSeriesMetadata(seriesId);
        await promoteStatusIfInactive(seriesId, !!latestCreatedChapter);

        if (latestCreatedChapter) {
            const series = await prisma.series.findUnique({
                where: { id: seriesId },
                select: { name: true, slug: true },
            });

            await notifyNewChapter({
                seriesId,
                seriesName: series?.name ?? originalSlug,
                chapterName: latestCreatedChapter.name,
                slug: series?.slug ?? originalSlug,
            });
        }
    } catch (error) {
        logger.error({ originalSlug, err: error.message }, "Error capítulos leermangaesp");
    }
}

export async function scrapeChapters() {
    logger.info("LeerMangaEsp - Capítulos incremental...");

    const provider = await prisma.provider.findUnique({
        where: { name: "leermangaesp" },
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
            url: true,
        },
    });

    await Promise.all(
        providerSeriesList.map((ps) =>
            limit(() => processSeries(ps, provider.id)),
        ),
    );

    logger.info("LeerMangaEsp - Capítulos listos");
}
