import axios from "axios";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";

const limit = pLimit(3);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(page) {
    const response = await axios.get(
        "https://dashboard.olympusbiblioteca.com/api/series",
        {
            params: { page, direction: "asc", type: "comic" },
            timeout: 10000,
        },
    );

    return response.data.data.series;
}

async function processSeries(series) {
    const existing = await prisma.series.findUnique({
        where: { id: series.id },
        select: { chapterCount: true },
    });

    if (!existing) {
        // Nueva serie
        await prisma.series.create({
            data: {
                id: series.id,
                name: series.name,
                slug: series.slug,
                status: series.status?.name ?? null,
                cover: series.cover,
                chapterCount: series.chapter_count,
            },
        });

        console.log(`Nueva serie: ${series.name}`);
        return;
    }

    // Si cambió cantidad de capítulos → necesita revisar
    if (existing.chapterCount !== series.chapter_count) {
        await prisma.series.update({
            where: { id: series.id },
            data: {
                chapterCount: series.chapter_count,
                lastChaptersCheck: null,
            },
        });

        console.log(`Serie actualizada: ${series.name}`);
    }
}

export async function scrapeSeries() {
    console.log("Series incremental...");

    const first = await fetchPage(1);

    const lastPage = first.last_page;
    const seriesList = first.data ?? [];

    await Promise.all(seriesList.map((s) => limit(() => processSeries(s))));

    for (let page = 2; page <= lastPage; page++) {
        const pageData = await fetchPage(page);

        await Promise.all(
            (pageData.data ?? []).map((s) => limit(() => processSeries(s))),
        );

        await sleep(400);
    }

    console.log("Series listas");
}
