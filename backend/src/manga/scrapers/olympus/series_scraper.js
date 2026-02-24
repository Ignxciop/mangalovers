import axios from "axios";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";

const limit = pLimit(1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(page) {
    const { data } = await axios.get(
        "https://dashboard.olympusbiblioteca.com/api/series",
        {
            params: { page, direction: "asc", type: "comic" },
            timeout: 10000,
        },
    );

    const seriesContainer = data.data.series;

    return {
        series: seriesContainer.data,
        lastPage: seriesContainer.last_page,
    };
}

async function fetchMetadata(slug) {
    try {
        const { data } = await axios.get(
            `https://dashboard.olympusbiblioteca.com/api/series/${slug}`,
            {
                params: { type: "comic" },
                timeout: 10000,
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

async function syncGenres(seriesId, genreNames) {
    for (const name of genreNames) {
        const genre = await prisma.genre.upsert({
            where: { name },
            create: { name },
            update: {},
        });

        await prisma.seriesGenre.upsert({
            where: {
                seriesId_genreId: {
                    seriesId,
                    genreId: genre.id,
                },
            },
            create: {
                seriesId,
                genreId: genre.id,
            },
            update: {},
        });
    }
}

async function processSeries(seriesData, providerId) {
    const slug = seriesData.slug;

    const existing = await prisma.series.findUnique({
        where: { slug },
    });

    let metadata = null;

    if (!existing || !existing.metadataFetchedAt || !existing.summary) {
        metadata = await fetchMetadata(slug);
    }

    const updatedSeries = await prisma.series.upsert({
        where: { slug: seriesData.slug },

        create: {
            name: seriesData.name,
            slug: seriesData.slug,
            cover: seriesData.cover,
            status: metadata?.status ?? seriesData.status?.name ?? null,
            summary: metadata?.summary ?? null,
            chapterCount: seriesData.chapter_count,
            metadataFetchedAt: metadata ? new Date() : null,
        },

        update: {
            name: seriesData.name,
            cover: seriesData.cover,
            chapterCount: seriesData.chapter_count,
            status: metadata?.status ?? seriesData.status?.name ?? null,
            summary: metadata?.summary ?? undefined,
            metadataFetchedAt: metadata ? new Date() : undefined,
        },
    });

    if (metadata?.status && existing?.status !== metadata.status) {
        await prisma.series.update({
            where: { id: updatedSeries.id },
            data: {
                status: metadata.status,
            },
        });

        console.log(`Status actualizado para ${slug}: ${metadata.status}`);
    }

    if (metadata?.genres?.length) {
        await syncGenres(updatedSeries.id, metadata.genres);
    }

    await prisma.providerSeries.upsert({
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
            slug: seriesData.slug,
        },
        update: {
            seriesId: updatedSeries.id,
            slug: seriesData.slug,
        },
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
