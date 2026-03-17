import axios from "axios";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";

const limit = pLimit(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BASE_URL = "https://manhwawebbackend-production.up.railway.app";

async function fetchSeriesWithChapters(externalId, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(
                `${BASE_URL}/manhwa/see/${externalId}`,
                { timeout: 30000 },
            );
            return data;
        } catch (error) {
            if (i === retries - 1) throw error;
            console.warn(`Reintentando ${externalId} (intento ${i + 2})...`);
            await sleep(2000 * (i + 1));
        }
    }
}

async function processSeries(providerSeries, providerId) {
    const externalId = providerSeries.externalId;
    const seriesId = providerSeries.seriesId;

    console.log(`Revisando capítulos: ${externalId}`);

    try {
        const data = await fetchSeriesWithChapters(externalId);
        const chapters = (data.chapters ?? []).slice().reverse();

        for (const ch of chapters) {
            const chapterExternalId = `${externalId}-${ch.chapter}`;
            const chapterName = String(ch.chapter);

            const existingProviderChapter =
                await prisma.providerChapter.findUnique({
                    where: {
                        providerId_externalId: {
                            providerId,
                            externalId: chapterExternalId,
                        },
                    },
                });

            if (existingProviderChapter) break;

            const existingChapterInSeries = await prisma.chapter.findFirst({
                where: { seriesId, name: chapterName },
            });

            if (existingChapterInSeries) {
                await prisma.providerChapter.create({
                    data: {
                        providerId,
                        externalId: chapterExternalId,
                        chapterId: existingChapterInSeries.id,
                    },
                });
                console.log(`↷ Capítulo ya existe, vinculado: ${chapterName}`);
                continue;
            }

            const publishedAt = ch.create ? new Date(ch.create) : new Date();

            const newChapter = await prisma.chapter.create({
                data: { name: chapterName, publishedAt, seriesId },
            });

            await prisma.providerChapter.create({
                data: {
                    providerId,
                    externalId: chapterExternalId,
                    chapterId: newChapter.id,
                },
            });

            console.log(`Capítulo nuevo: ${chapterName}`);
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
        console.error(`Error capítulos ${externalId}:`, error.message);
    }
}

export async function scrapeChapters() {
    console.log("ManhwaWeb - Capítulos incremental...");

    const provider = await prisma.provider.findUnique({
        where: { name: "manhwaweb" },
    });

    const providerSeriesList = await prisma.providerSeries.findMany({
        where: {
            providerId: provider.id,
            OR: [
                { series: { lastChaptersCheck: null } },
                {
                    series: {
                        lastChaptersCheck: {
                            lt: new Date(Date.now() - 1000 * 60 * 60),
                        },
                    },
                },
            ],
        },
        select: {
            id: true,
            externalId: true,
            seriesId: true,
        },
    });

    await Promise.all(
        providerSeriesList.map((ps) =>
            limit(() => processSeries(ps, provider.id)),
        ),
    );

    console.log("ManhwaWeb - Capítulos listos");
}
