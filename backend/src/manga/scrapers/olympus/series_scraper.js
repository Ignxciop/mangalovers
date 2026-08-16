import axios from "axios";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";
import logger from "../../../config/logger.js";
import { syncGenres } from "../syncGenres.js";
import { getAbortSignal } from "../scraperAbort.js";

const limit = pLimit(1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(page, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(
                "https://olympusbiblioteca.com/api/series",
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
            logger.warn({ page, attempt: i + 2 }, "Reintentando página olympus");
            await sleep(2000 * (i + 1));
        }
    }
}

async function fetchMetadata(slug) {
    try {
        const { data } = await axios.get(
            `https://olympusbiblioteca.com/api/series/${slug}`,
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
        logger.error({ slug, status: error.response?.status }, "Error metadata olympus");
        return null;
    }
}

export async function processSeries(seriesData, providerId) {
    const slug = seriesData.slug;
    const externalId = String(seriesData.id);

    const existingProviderSeries = await prisma.providerSeries.findUnique({
        where: { providerId_externalId: { providerId, externalId } },
        include: { series: true },
    });

    if (existingProviderSeries) {
        const seriesId = existingProviderSeries.seriesId;
        const oldSlug = existingProviderSeries.series.slug;

        let metadata = null;
        if (
            !existingProviderSeries.series.metadataFetchedAt ||
            !existingProviderSeries.series.summary
        ) {
            metadata = await fetchMetadata(slug);
        }

        await prisma.$transaction(async (tx) => {
            await tx.series.update({
                where: { id: seriesId },
                data: {
                    name: seriesData.name,
                    cover: metadata?.cover ?? seriesData.cover ?? undefined,
                    chapterCount: seriesData.chapter_count,
                    status:
                        metadata?.status ??
                        seriesData.status?.name ??
                        undefined,
                    summary: metadata?.summary ?? undefined,
                    metadataFetchedAt: metadata ? new Date() : undefined,
                    type: "manhwa",
                },
            });

            if (metadata?.genres?.length) {
                await syncGenres(seriesId, metadata.genres, tx);
            }

            await tx.providerSeries.update({
                where: { providerId_externalId: { providerId, externalId } },
                data: { slug },
            });
        });

        if (oldSlug !== slug) {
            logger.info(
                { oldSlug, slug },
                "Slug del proveedor actualizado (series.slug permanece estable)",
            );
        }
        return;
    }

    let metadata = null;
    const existingBySlug = await prisma.series.findUnique({ where: { slug } });
    if (
        !existingBySlug ||
        !existingBySlug.metadataFetchedAt ||
        !existingBySlug.summary
    ) {
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
                type: "manhwa",
            },
            update: {
                name: seriesData.name,
                cover: metadata?.cover ?? seriesData.cover ?? undefined,
                chapterCount: seriesData.chapter_count,
                status:
                    metadata?.status ?? seriesData.status?.name ?? undefined,
                summary: metadata?.summary ?? undefined,
                metadataFetchedAt: metadata ? new Date() : undefined,
                type: "manhwa",
            },
        });

        if (metadata?.genres?.length) {
            await syncGenres(updatedSeries.id, metadata.genres, tx);
        }

        await tx.providerSeries.upsert({
            where: { providerId_externalId: { providerId, externalId } },
            create: {
                providerId,
                seriesId: updatedSeries.id,
                externalId,
                slug,
            },
            update: {
                seriesId: updatedSeries.id,
                slug,
            },
        });
    });

    logger.info({ name: seriesData.name }, "Serie procesada olympus");
}

export async function scrapeSeries() {
    logger.info("Series + metadata incremental...");

    const provider = await prisma.provider.findUnique({
        where: { name: "olympus" },
    });

    if (!provider) {
        throw new Error("Provider olympus no existe");
    }

    const signal = getAbortSignal("olympus");

    const firstPage = await fetchPage(1);
    const lastPage = firstPage.lastPage;

    await Promise.all(
        firstPage.series.map((s) => limit(() => processSeries(s, provider.id))),
    );

    for (let page = 2; page <= lastPage; page++) {
        if (signal.aborted) {
            logger.info("Series scraper olympus detenido manualmente");
            return;
        }
        const pageData = await fetchPage(page);

        await Promise.all(
            pageData.series.map((s) =>
                limit(() => processSeries(s, provider.id)),
            ),
        );

        await sleep(400);
    }

    logger.info("Series y metadata listas");
}
