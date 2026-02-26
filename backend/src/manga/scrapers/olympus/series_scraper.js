import axios from "axios";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";
import { normalizeGenre } from "../normalizeGenre.js";

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
    for (const rawName of genreNames) {
        const name = normalizeGenre(rawName);
        if (!name) continue;

        const genre = await tx.genre.upsert({
            where: { name },
            create: { name },
            update: {},
        });

        await tx.seriesGenre.upsert({
            where: { seriesId_genreId: { seriesId, genreId: genre.id } },
            create: { seriesId, genreId: genre.id },
            update: {},
        });
    }
}

async function processSeries(seriesData, providerId) {
    const slug = seriesData.slug;

    const existing = await prisma.series.findUnique({ where: { slug } });

    let metadata = null;
    if (!existing || !existing.metadataFetchedAt || !existing.summary) {
        metadata = await fetchMetadata(slug);
    }

    await prisma.$transaction(async (tx) => {
        const updatedSeries = await tx.series.upsert({
            where: { slug },
            create: {
                name: seriesData.name,
                slug,
                cover: metadata?.cover ?? seriesData.cover ?? null,
                status: metadata?.status ?? seriesData.status?.name ?? null,
                summary: metadata?.summary ?? null,
                chapterCount: seriesData.chapter_count,
                metadataFetchedAt: metadata ? new Date() : null,
            },
            update: {
                name: seriesData.name,
                cover: metadata?.cover ?? seriesData.cover ?? undefined,
                chapterCount: seriesData.chapter_count,
                status:
                    metadata?.status ?? seriesData.status?.name ?? undefined,
                summary: metadata?.summary ?? undefined,
                metadataFetchedAt: metadata ? new Date() : undefined,
            },
        });

        if (metadata?.genres?.length) {
            await syncGenres(updatedSeries.id, metadata.genres, tx);
        }

        await tx.providerSeries.upsert({
            where: {
                providerId_externalId: {
                    providerId,
                    externalId: String(seriesData.id),
                },
            },
            create: {
                providerId,
                seriesId: updatedSeries.id,
                externalId: String(seriesData.id),
                slug,
            },
            update: {
                seriesId: updatedSeries.id,
                slug,
            },
        });
    });
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
