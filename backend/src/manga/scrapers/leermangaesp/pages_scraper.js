import axios from "axios";
import * as cheerio from "cheerio";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";
import logger from "../../../config/logger.js";
import { getAbortSignal } from "../scraperAbort.js";
import { notifyNewChapter } from "../../../notifications/pushService.js";

const limit = pLimit(3);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BASE_URL = "https://leermangaesp.net";

function buildPagesFromRutas(data) {
    const scriptMatch = data.match(/paginasRutas\s*=\s*\[([^\]]+)\]/);
    if (!scriptMatch) return [];
    const urls = scriptMatch[1].match(/"([^"]+)"/g);
    if (!urls) return [];
    return urls.map((u) => {
        const path = u.replace(/"/g, "");
        return path.startsWith("http") ? path : `${BASE_URL}${path}`;
    });
}

async function fetchReaderPages(originalSlug, chapterNumber, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const url = `${BASE_URL}/leer-m/${originalSlug}/${chapterNumber}/`;
            logger.debug({ url }, "Fetching reader page leermangaesp");
            const { data } = await axios.get(url, { timeout: 30000 });
            const $ = cheerio.load(data);
            const pages = [];

            $("img.manga-image").each((_, el) => {
                const src = $(el).attr("src");
                if (src) pages.push(src);
            });

            const fallbackPages = buildPagesFromRutas(data);

            if (pages.length > 0) {
                try {
                    const res = await axios.head(pages[0], { timeout: 5000 });
                    if (res.status >= 200 && res.status < 400) return pages;
                } catch {
                    // CDN failed, usa fallback
                }
            }

            if (fallbackPages.length > 0) return fallbackPages;

            return [];
        } catch (error) {
            if (i === retries - 1) throw error;
            await sleep(2000 * (i + 1));
        }
    }
}

async function processChapter(providerChapter, providerId) {
    try {
        logger.info(
            {
                chapterId: providerChapter.chapterId,
                externalId: providerChapter.externalId,
                seriesId: providerChapter.chapter.seriesId,
            },
            "Procesando capítulo leermangaesp",
        );

        const providerSeries = await prisma.providerSeries.findFirst({
            where: {
                providerId,
                seriesId: providerChapter.chapter.seriesId,
            },
            select: { url: true, externalId: true },
        });

        const originalSlug = providerSeries?.url;
        const chapterNumber = providerChapter.externalId
            .split("-")
            .slice(1)
            .join("-")
            .replace(/\.0+$/, "");

        if (!originalSlug || !chapterNumber) {
            logger.warn(
                { chapterId: providerChapter.chapterId },
                "Faltan datos para scrapear páginas leermangaesp",
            );
            return;
        }

        const pages = await fetchReaderPages(originalSlug, chapterNumber);

        if (!pages.length) {
            logger.warn(
                { chapterId: providerChapter.chapterId },
                "Sin páginas leermangaesp, se reintentará",
            );
            return;
        }

        await prisma.page.createMany({
            data: pages.map((url) => ({
                url,
                chapterId: providerChapter.chapterId,
            })),
            skipDuplicates: true,
        });

        await prisma.chapter.update({
            where: { id: providerChapter.chapterId },
            data: { pagesScraped: true },
        });

        const config = await prisma.scraperConfig.findFirst();
        const freshnessMs = (config?.intervalMinutes ?? 60) * 60 * 1000 * 2;
        const chapterAge = Date.now() - new Date(providerChapter.chapter.createdAt).getTime();
        if (chapterAge < freshnessMs) {
            const series = await prisma.series.findUnique({
                where: { id: providerChapter.chapter.seriesId },
                select: { name: true, slug: true },
            });
            await notifyNewChapter({
                seriesId: providerChapter.chapter.seriesId,
                seriesName: series?.name ?? originalSlug,
                chapterName: providerChapter.chapter.name,
                slug: series?.slug ?? originalSlug,
            });
        }

        logger.debug(
            { chapterId: providerChapter.chapterId, pageCount: pages.length },
            "Páginas leermangaesp scrapeadas",
        );
        await sleep(200);
    } catch (err) {
        logger.error(
            { chapterId: providerChapter.chapterId, err: err.message },
            "Error páginas leermangaesp",
        );
    }
}

export async function processChapterPages(providerChapter, providerId) {
    return processChapter(providerChapter, providerId);
}

export async function scrapePages() {
    logger.info("LeerMangaEsp - Páginas incremental...");

    const provider = await prisma.provider.findUnique({
        where: { name: "leermangaesp" },
    });

    const providerChapters = await prisma.providerChapter.findMany({
        where: {
            providerId: provider.id,
            chapter: { pagesScraped: false },
        },
        include: {
            chapter: true,
        },
    });

    logger.info({ count: providerChapters.length }, "LeerMangaEsp - Capítulos por scrapear páginas");

    const signal = getAbortSignal("leermangaesp");

    let completed = 0;
    const total = providerChapters.length;

    await Promise.all(
        providerChapters.map((pc) =>
            limit(async () => {
                if (signal.aborted) return;
                await processChapter(pc, provider.id);
                completed++;
                if (completed % 10 === 0 || completed === total) {
                    logger.info({ completed, total }, "LeerMangaEsp - Progreso páginas");
                }
            }),
        ),
    );

    if (signal.aborted) {
        logger.info("LeerMangaEsp - Scrapeo de páginas detenido manualmente");
        return;
    }

    logger.info("LeerMangaEsp - Páginas listas");
}
