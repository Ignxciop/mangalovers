import axios from "axios";
import * as cheerio from "cheerio";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";
import logger from "../../../config/logger.js";
import { updateSeriesMetadata } from "../updateSeriesMetadata.js";
import { getAbortSignal } from "../scraperAbort.js";
import { promoteStatusIfInactive } from "../resolveStatus.js";
import { normalizeChapterNumber } from "../normalizeChapter.js";

const limit = pLimit(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_CONSECUTIVE_EXISTING = 10;

const BASE_URL = "https://leermangaesp.net";

async function fetchPage(originalSlug, before = null, retries = 3) {
    const url = before
        ? `${BASE_URL}/manga/${originalSlug}/?before=${before}`
        : `${BASE_URL}/manga/${originalSlug}/`;

    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(url, { timeout: 30000 });
            return data;
        } catch (error) {
            if (i === retries - 1) throw error;
            logger.warn({ url, attempt: i + 2 }, "Reintentando fetch leermangaesp");
            await sleep(2000 * (i + 1));
        }
    }
}

function extractChaptersFromHTML(html, externalId) {
    const $ = cheerio.load(html);
    const chapters = [];

    $("#chapter-list .chapter-link").each((_, el) => {
        const $el = $(el);
        const rawNumber = $el.attr("data-chapter");
        if (!rawNumber) return;

        const chapterDate = $el.find(".chapter-date").text().trim();
        const href = $el.attr("href");
        const { name, number } = normalizeChapterNumber(rawNumber);

        chapters.push({
            rawNumber,
            number: number ?? rawNumber,
            name: name ?? `Capítulo ${rawNumber}`,
            date: chapterDate || null,
            href: href || null,
            externalId: `${externalId}-${rawNumber}`,
        });
    });

    const moreLink = $("#more-link");
    let nextBefore = null;
    if (moreLink.length) {
        const href = moreLink.attr("href");
        if (href) {
            const match = href.match(/[?&]before=([\d.]+)/);
            if (match) nextBefore = match[1];
        }
    }

    return { chapters, nextBefore };
}

async function processSeries(providerSeries, providerId) {
    const originalSlug = providerSeries.url;
    const externalId = providerSeries.externalId;
    const seriesId = providerSeries.seriesId;

    if (getAbortSignal("leermangaesp").aborted) return;

    logger.info({ originalSlug }, "Revisando capítulos leermangaesp");

    let latestCreatedChapter = null;

    try {
        let before = null;
        let maxPages = 20;
        let consecutiveExisting = 0;
        let shouldStopAll = false;

        for (let page = 0; page < maxPages && !shouldStopAll; page++) {
            const html = await fetchPage(originalSlug, before);
            const { chapters, nextBefore } = extractChaptersFromHTML(html, externalId);

            for (const ch of chapters) {
                const existingProviderChapter =
                    await prisma.providerChapter.findUnique({
                        where: {
                            providerId_externalId: {
                                providerId,
                                externalId: ch.externalId,
                            },
                        },
                    });

                if (existingProviderChapter) {
                    consecutiveExisting++;
                    if (consecutiveExisting >= MAX_CONSECUTIVE_EXISTING) {
                        shouldStopAll = true;
                        logger.debug({ originalSlug, consecutiveExisting }, "Ya existen suficientes capítulos, deteniendo");
                    }
                    continue;
                }

                consecutiveExisting = 0;

                const chapterNumberFloat = typeof ch.number === "number" ? ch.number : parseFloat(ch.number);
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
                            externalId: ch.externalId,
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
                        number: isNaN(chapterNumberFloat) ? null : chapterNumberFloat,
                        publishedAt,
                        seriesId,
                    },
                });

                latestCreatedChapter = newChapter;

                await prisma.providerChapter.create({
                    data: {
                        providerId,
                        externalId: ch.externalId,
                        chapterId: newChapter.id,
                    },
                });

                logger.debug({ chapterName: ch.name, externalId }, "Capítulo nuevo leermangaesp");
            }

            if (!nextBefore || shouldStopAll) break;
            before = nextBefore;
            await sleep(1500);
        }

        await updateSeriesMetadata(seriesId);
        await promoteStatusIfInactive(seriesId, !!latestCreatedChapter);
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
            externalId: true,
            seriesId: true,
            url: true,
        },
    });

    if (getAbortSignal("leermangaesp").aborted) return;

    await Promise.all(
        providerSeriesList.map((ps) =>
            limit(() => processSeries(ps, provider.id)),
        ),
    );

    logger.info("LeerMangaEsp - Capítulos listos");
}
