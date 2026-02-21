import axios from "axios";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";

const limit = pLimit(5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPages(slug, chapterId) {
    const { data } = await axios.get(
        `https://olympusbiblioteca.com/api/capitulo/${slug}/${chapterId}`,
        { params: { type: "comic" }, timeout: 10000 },
    );

    return data.chapter.pages;
}

async function processChapter(chapter) {
    try {
        const pages = await fetchPages(chapter.series.slug, chapter.id);

        await prisma.page.createMany({
            data: pages.map((url) => ({
                url,
                chapterId: chapter.id,
            })),
            skipDuplicates: true,
        });

        await prisma.chapter.update({
            where: { id: chapter.id },
            data: { pagesScraped: true },
        });

        console.log(`${chapter.id} → ${pages.length} páginas`);
        await sleep(200);
    } catch (err) {
        console.error(`Error capítulo ${chapter.id}`);
    }
}

export async function scrapePages() {
    console.log("Páginas incremental...");

    const chapters = await prisma.chapter.findMany({
        where: { pagesScraped: false },
        select: {
            id: true,
            series: { select: { slug: true } },
        },
    });

    await Promise.all(chapters.map((ch) => limit(() => processChapter(ch))));

    console.log("Páginas listas");
}
