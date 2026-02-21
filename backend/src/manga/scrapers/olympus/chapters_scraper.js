import axios from "axios";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";

const limit = pLimit(4);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchChapters(slug, page) {
    const { data } = await axios.get(
        `https://dashboard.olympusbiblioteca.com/api/series/${slug}/chapters`,
        { params: { page, direction: "desc", type: "comic" }, timeout: 10000 },
    );

    return data;
}

async function processSeries(series) {
    console.log(`Revisando: ${series.slug}`);

    const firstPage = await fetchChapters(series.slug, 1);
    const lastPage = firstPage.meta.last_page;

    for (let page = 1; page <= lastPage; page++) {
        const data =
            page === 1 ? firstPage : await fetchChapters(series.slug, page);

        for (const ch of data.data) {
            const exists = await prisma.chapter.findUnique({
                where: { id: ch.id },
            });

            if (exists) {
                console.log("Capítulo existente encontrado, stop.");
                await prisma.series.update({
                    where: { id: series.id },
                    data: { lastChaptersCheck: new Date() },
                });
                return;
            }

            await prisma.chapter.create({
                data: {
                    id: ch.id,
                    name: ch.name,
                    publishedAt: new Date(ch.published_at),
                    seriesId: series.id,
                },
            });

            console.log(`Capítulo nuevo: ${ch.name}`);
        }

        await sleep(300);
    }

    await prisma.series.update({
        where: { id: series.id },
        data: {
            lastChaptersCheck: new Date(),
            lastChapterPublishedAt:
                newestChapterDate >
                (series.lastChapterPublishedAt ?? new Date(0))
                    ? newestChapterDate
                    : series.lastChapterPublishedAt,
        },
    });
}

export async function scrapeChapters() {
    console.log("Capítulos incremental...");

    const seriesList = await prisma.series.findMany({
        where: { lastChaptersCheck: null },
        select: { id: true, slug: true },
    });

    await Promise.all(
        seriesList.map((series) => limit(() => processSeries(series))),
    );

    console.log("Capítulos listos");
}
