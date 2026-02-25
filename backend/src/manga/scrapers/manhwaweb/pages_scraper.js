import axios from "axios";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";

const limit = pLimit(3);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BASE_URL = "https://manhwawebbackend-production.up.railway.app";

async function fetchPages(externalChapterId, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(
                `${BASE_URL}/chapters/see/${externalChapterId}`,
                { timeout: 30000 },
            );
            return (data.chapter?.img ?? []).filter((url) => url?.trim());
        } catch (error) {
            if (i === retries - 1) throw error;
            await sleep(2000 * (i + 1));
        }
    }
}

async function processChapter(providerChapter, providerId) {
    try {
        const pages = await fetchPages(providerChapter.externalId);

        if (!pages.length) {
            console.warn(`Sin páginas: ${providerChapter.externalId}`);
            await prisma.chapter.update({
                where: { id: providerChapter.chapterId },
                data: { pagesScraped: true },
            });
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

        console.log(`${providerChapter.externalId} → ${pages.length} páginas`);
        await sleep(200);
    } catch (err) {
        console.error(
            `Error páginas ${providerChapter.externalId}:`,
            err.message,
        );
    }
}

export async function scrapePages() {
    console.log("ManhwaWeb - Páginas incremental...");

    const provider = await prisma.provider.findUnique({
        where: { name: "manhwaweb" },
    });

    const providerChapters = await prisma.providerChapter.findMany({
        where: {
            providerId: provider.id,
            chapter: { pagesScraped: false },
        },
        include: { chapter: true },
    });

    await Promise.all(
        providerChapters.map((pc) =>
            limit(() => processChapter(pc, provider.id)),
        ),
    );

    console.log("ManhwaWeb - Páginas listas");
}
