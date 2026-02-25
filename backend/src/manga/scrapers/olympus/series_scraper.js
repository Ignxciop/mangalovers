import axios from "axios";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";

const limit = pLimit(1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(page, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(
                "https://dashboard.olympusbiblioteca.com/api/series",
                {
                    params: { page, direction: "asc", type: "comic" },
                    timeout: 30000,
                },
            );
            return {
                series: data.data.series.data,
                lastPage: data.data.series.last_page,
            };
        } catch (error) {
            if (i === retries - 1) throw error;
            console.warn(`Reintentando página ${page} (intento ${i + 2})...`);
            await sleep(2000 * (i + 1));
        }
    }
}

async function fetchMetadata(slug) {
    try {
        const { data } = await axios.get(
            `https://dashboard.olympusbiblioteca.com/api/series/${slug}`,
            {
                params: { type: "comic" },
                timeout: 30000,
            },
        );

        const series = data.data;

        return {
            summary: series.summary ?? null,
            genres: series.genres?.map((g) => g.name.trim()) ?? [],
            status: series.status?.name ?? null,
            cover: series.cover ?? null,
        };
    } catch (error) {
        console.error(`Error metadata ${slug}`);
        return null;
    }
}

async function syncGenres(seriesId, genreNames, tx = prisma) {
    for (const name of genreNames) {
        const genre = await tx.genre.upsert({
            where: { name },
            create: { name },
            update: {},
        });

        await tx.seriesGenre.upsert({
            where: {
                seriesId_genreId: {
                    seriesId,
                    genreId: genre.id,
                },
            },
            create: { seriesId, genreId: genre.id },
            update: {},
        });
    }
}

async function processSeries(providerSeries, providerId) {
    const slug = providerSeries.slug;
    const seriesId = providerSeries.seriesId;

    console.log(`Revisando: ${slug}`);

    try {
        const firstPage = await fetchChapters(slug, 1);
        const lastPage = firstPage.meta.last_page;

        for (let page = 1; page <= lastPage; page++) {
            const data =
                page === 1 ? firstPage : await fetchChapters(slug, page);

            for (const ch of data.data) {
                const externalId = ch.id;

                const existingProviderChapter =
                    await prisma.providerChapter.findUnique({
                        where: {
                            providerId_externalId: { providerId, externalId },
                        },
                    });

                if (existingProviderChapter) {
                    const latestChapter = await prisma.chapter.findFirst({
                        where: { seriesId },
                        orderBy: { publishedAt: "desc" },
                        select: { publishedAt: true },
                    });

                    await prisma.series.update({
                        where: { id: seriesId },
                        data: {
                            lastChaptersCheck: new Date(),
                            lastChapterPublishedAt:
                                latestChapter?.publishedAt ?? null,
                        },
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
                    data: { providerId, externalId, chapterId: newChapter.id },
                });

                console.log(`Capítulo nuevo: ${ch.name}`);
            }

            await sleep(300);
        }

        const latestChapter = await prisma.chapter.findFirst({
            where: { seriesId },
            orderBy: { publishedAt: "desc" },
            select: { publishedAt: true },
        });

        await prisma.series.update({
            where: { id: seriesId },
            data: {
                lastChaptersCheck: new Date(),
                lastChapterPublishedAt: latestChapter?.publishedAt ?? null,
            },
        });
    } catch (error) {
        console.error(`Error procesando serie ${slug}:`, error.message);
    }
}

export async function scrapeSeries() {
    console.log("Series + metadata incremental...");

    const provider = await prisma.provider.findUnique({
        where: { name: "olympus" },
    });

    if (!provider) {
        throw new Error("Provider olympus no existe");
    }

    const firstPage = await fetchPage(1);
    const lastPage = firstPage.lastPage;

    await Promise.all(
        firstPage.series.map((s) => limit(() => processSeries(s, provider.id))),
    );

    for (let page = 2; page <= lastPage; page++) {
        const pageData = await fetchPage(page);

        await Promise.all(
            pageData.series.map((s) =>
                limit(() => processSeries(s, provider.id)),
            ),
        );

        await sleep(400);
    }

    console.log("Series y metadata listas");
}
