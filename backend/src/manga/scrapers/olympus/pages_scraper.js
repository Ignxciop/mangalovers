import axios from "axios";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";
import logger from "../../../config/logger.js";
import { getAbortSignal } from "../scraperAbort.js";
import { notifyNewChapter } from "../../../notifications/pushService.js";

const limit = pLimit(5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// URL única de páginas de Olympus (fuente de verdad para scraper y admin).
// El segmento es el NOMBRE del capítulo, no el id numérico: el endpoint
// responde 404 con el id. Sin parámetros (?type=comic no es necesario).
export function buildOlympusChapterPagesUrl(slug, chapterName) {
    return `https://olympusxyz.com/api/capitulo/${slug}/${encodeURIComponent(chapterName)}`;
}

export async function fetchOlympusChapterPages(slug, chapterName) {
    const { data } = await axios.get(buildOlympusChapterPagesUrl(slug, chapterName), {
        timeout: 30000,
    });

    return data.chapter?.pages ?? [];
}

async function processChapter(providerChapter, providerId) {
    const chapterId = providerChapter.chapterId;
    let chapterSegment = null;
    let slug = null;

    try {
        chapterSegment = providerChapter.externalName ?? providerChapter.chapter.name;

        const providerSeries = await prisma.providerSeries.findFirst({
            where: {
                providerId,
                seriesId: providerChapter.chapter.seriesId,
            },
            select: { slug: true },
        });

        if (!providerSeries) {
            logger.warn(
                { chapterId, seriesId: providerChapter.chapter.seriesId },
                "ProviderSeries no encontrado olympus, capítulo omitido",
            );
            return;
        }
        slug = providerSeries.slug;

        const pages = await fetchOlympusChapterPages(slug, chapterSegment);

        if (!pages.length) {
            logger.warn({ chapterId }, "Sin páginas olympus, se reintentará");
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
                select: { name: true },
            });
            await notifyNewChapter({
                seriesId: providerChapter.chapter.seriesId,
                seriesName: series?.name ?? providerSeries.slug,
                chapterName: providerChapter.chapter.name,
                slug: providerSeries.slug,
            });
        }

        logger.debug({ chapterId, pageCount: pages.length }, "Páginas olympus scrapeadas");
        await sleep(200);
    } catch (err) {
        logger.error(
            {
                chapterId,
                slug,
                segment: chapterSegment,
                url: slug ? buildOlympusChapterPagesUrl(slug, chapterSegment) : null,
                status: err.response?.status,
                err: err.message,
            },
            "Error capítulo olympus",
        );
    }
}

export async function processChapterPages(providerChapter, providerId) {
    return processChapter(providerChapter, providerId);
}

export async function scrapePages() {
    logger.info("Páginas incremental...");

    const provider = await prisma.provider.findUnique({
        where: { name: "olympus" },
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

    const signal = getAbortSignal("olympus");

    await Promise.all(
        providerChapters.map((pc) =>
            limit(() => {
                if (signal.aborted) return;
                return processChapter(pc, provider.id);
            }),
        ),
    );

    if (signal.aborted) {
        logger.info("Olympus - Scrapeo de páginas detenido manualmente");
        return;
    }

    logger.info("Páginas listas");
}
