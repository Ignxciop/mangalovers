import axios from "axios";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";
import logger from "../../../config/logger.js";
import { getAbortSignal } from "../scraperAbort.js";
import { notifyNewChapter } from "../../../notifications/pushService.js";

const limit = pLimit(3);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BASE_URL = "https://manhwawebbackend-production.up.railway.app";

async function fetchPages(externalChapterId, retries = 3) {
    const tryFormats = [
        `${BASE_URL}/chapters/see/${externalChapterId}`,
        `${BASE_URL}/chapters/see/${externalChapterId}_01`,
    ];

    for (let attempt = 0; attempt < tryFormats.length; attempt++) {
        const url = tryFormats[attempt];
        for (let i = 0; i < retries; i++) {
            try {
                const { data } = await axios.get(url, { timeout: 30000 });
                return (data.chapter?.img ?? []).filter((url) => url?.trim());
            } catch (error) {
                if (error.response?.status === 404 && attempt < tryFormats.length - 1) {
                    break;
                }
                if (i === retries - 1 && attempt === tryFormats.length - 1) throw error;
                if (i < retries - 1) await sleep(2000 * (i + 1));
            }
        }
    }
}

async function processChapter(providerChapter, providerId) {
    try {
        const pages = await fetchPages(providerChapter.externalId);

        if (!pages.length) {
            logger.warn({ externalId: providerChapter.externalId }, "Sin páginas manhwaweb, se reintentará");
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
            const [series, ps] = await Promise.all([
                prisma.series.findUnique({
                    where: { id: providerChapter.chapter.seriesId },
                    select: { name: true },
                }),
                prisma.providerSeries.findFirst({
                    where: { providerId, seriesId: providerChapter.chapter.seriesId },
                    select: { slug: true },
                }),
            ]);
            await notifyNewChapter({
                seriesId: providerChapter.chapter.seriesId,
                seriesName: series?.name ?? providerChapter.externalId,
                chapterName: providerChapter.chapter.name,
                slug: ps?.slug ?? providerChapter.externalId,
            });
        }

        logger.debug({ externalId: providerChapter.externalId, pageCount: pages.length }, "Páginas manhwaweb scrapeadas");
        await sleep(200);
    } catch (err) {
        logger.error({ externalId: providerChapter.externalId, err: err.message }, "Error páginas manhwaweb");
    }
}

export async function processChapterPages(providerChapter, providerId) {
    return processChapter(providerChapter, providerId);
}

export async function scrapePages() {
    logger.info("ManhwaWeb - Páginas incremental...");

    const provider = await prisma.provider.findUnique({
        where: { name: "manhwaweb" },
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

    const signal = getAbortSignal("manhwaweb");

    await Promise.all(
        providerChapters.map((pc) =>
            limit(() => {
                if (signal.aborted) return;
                return processChapter(pc, provider.id);
            }),
        ),
    );

    if (signal.aborted) {
        logger.info("ManhwaWeb - Scrapeo de páginas detenido manualmente");
        return;
    }

    logger.info("ManhwaWeb - Páginas listas");
}
