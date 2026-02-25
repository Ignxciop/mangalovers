import axios from "axios";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";

const limit = pLimit(4);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchChapters(slug, page, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(
                `https://dashboard.olympusbiblioteca.com/api/series/${slug}/chapters`,
                {
                    params: { page, direction: "desc", type: "comic" },
                    timeout: 30000,
                },
            );
            return data;
        } catch (error) {
            if (i === retries - 1) throw error;
            console.warn(
                `Reintentando capítulos ${slug} página ${page} (intento ${i + 2})...`,
            );
            await sleep(2000 * (i + 1));
        }
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
                const externalId = String(ch.id);

                const existingProviderChapter =
                    await prisma.providerChapter.findUnique({
                        where: {
                            providerId_externalId: {
                                providerId,
                                externalId: String(ch.id),
                            },
                        },
                    });

                if (existingProviderChapter) {
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
                    data: {
                        providerId,
                        externalId: String(externalId),
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
    } catch (error) {
        console.error(`Error procesando serie ${slug}:`, error.message);
    }
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
