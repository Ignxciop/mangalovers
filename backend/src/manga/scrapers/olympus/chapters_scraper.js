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

async function processSeries(providerSeries, providerId) {
    const slug = providerSeries.slug;
    const seriesId = providerSeries.seriesId;

    console.log(`Revisando: ${slug}`);

    const firstPage = await fetchChapters(slug, 1);
    const lastPage = firstPage.meta.last_page;

    for (let page = 1; page <= lastPage; page++) {
        const data = page === 1 ? firstPage : await fetchChapters(slug, page);

        for (const ch of data.data) {
            const externalId = ch.id;

            const existingProviderChapter =
                await prisma.providerChapter.findUnique({
                    where: {
                        providerId_externalId: {
                            providerId,
                            externalId,
                        },
                    },
                });

            if (existingProviderChapter) {
                await prisma.series.update({
                    where: { id: seriesId },
                    data: { lastChaptersCheck: new Date() },
                });

                console.log("Capítulo existente encontrado, stop.");
                return;
            }

            const newChapter = await prisma.chapter.create({
                data: {
                    name: ch.name,
                    publishedAt: new Date(ch.published_at),
                    seriesId,
                },
            });

            await prisma.providerChapter.create({
                data: {
                    providerId,
                    externalId,
                    chapterId: newChapter.id,
                },
            });

            console.log(`Capítulo nuevo: ${ch.name}`);
        }

        await sleep(300);
    }

    await prisma.series.update({
        where: { id: seriesId },
        data: { lastChaptersCheck: new Date() },
    });
}

export async function scrapeChapters() {
    console.log("Capítulos incremental...");

    const provider = await prisma.provider.findUnique({
        where: { name: "olympus" },
    });

    const providerSeriesList = await prisma.providerSeries.findMany({
        where: {
            providerId: provider.id,
            series: { lastChaptersCheck: null },
        },
        select: {
            id: true,
            slug: true,
            seriesId: true,
        },
    });

    await Promise.all(
        providerSeriesList.map((ps) =>
            limit(() => processSeries(ps, provider.id)),
        ),
    );

    console.log("Capítulos listos");
}
