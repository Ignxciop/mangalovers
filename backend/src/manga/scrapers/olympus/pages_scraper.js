import axios from "axios";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";
import logger from "../../../config/logger.js";

const limit = pLimit(5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPages(slug, externalChapterId) {
    const { data } = await axios.get(
        `https://olympusbiblioteca.com/api/capitulo/${slug}/${externalChapterId}`,
        { params: { type: "comic" }, timeout: 30000 },
    );

    return data.chapter.pages;
}

async function processChapter(providerChapter, providerId) {
    try {
        const providerSeries = await prisma.providerSeries.findFirst({
            where: {
                providerId,
                seriesId: providerChapter.chapter.seriesId,
            },
            select: { slug: true },
        });

        const pages = await fetchPages(
            providerSeries.slug,
            providerChapter.externalId,
        );

        if (!pages.length) {
            logger.warn({ chapterId: providerChapter.chapterId }, "Sin páginas olympus, se reintentará");
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

        logger.debug({ chapterId: providerChapter.chapterId, pageCount: pages.length }, "Páginas olympus scrapeadas");
        await sleep(200);
    } catch (err) {
        logger.error({ chapterId: providerChapter.chapterId, err: err.message }, "Error capítulo olympus");
    }
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

    await Promise.all(
        providerChapters.map((pc) =>
            limit(() => processChapter(pc, provider.id)),
        ),
    );

    logger.info("Páginas listas");
}
