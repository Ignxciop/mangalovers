import axios from "axios";
import * as cheerio from "cheerio";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";
import logger from "../../../config/logger.js";
import { syncGenres } from "../syncGenres.js";
import { MANUAL_ALIASES } from "../manualAliases.js";
import {
    syncManualAliases,
    resolveCanonicalSeries,
    createSeriesRelation,
    normalizeSeriesName,
} from "../seriesMatcher.js";

const limit = pLimit(1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BASE_URL = "https://leermangaesp.net";
const CDN_URL = "https://images.leermangaesp.net/file/leermangaesp";

const TYPE_MAP = {
    manga: "manga",
    manhwa: "manhwa",
    manhua: "manhua",
};

const STATUS_MAP = {
    "En curso": "Activo",
    "Completado": "Finalizado",
    "En pausa": "En pausa",
    "Cancelado": "Abandonado por el scan",
};

function buildCoverUrl(portada) {
    if (!portada) return null;
    if (portada.startsWith("http")) return portada;
    return `${CDN_URL}/${portada}`;
}

async function verifyUrl(url) {
    if (!url) return false;
    try {
        const res = await axios.head(url, { timeout: 5000 });
        return res.status >= 200 && res.status < 400;
    } catch {
        return false;
    }
}

async function fetchPage(page, tipo, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(`${BASE_URL}/api/buscar_mangas/`, {
                params: { tipo, page, page_size: 20 },
                timeout: 30000,
            });
            return {
                series: data.resultados ?? [],
                totalPages: data.total_pages ?? 1,
            };
        } catch (error) {
            if (i === retries - 1) throw error;
            logger.warn({ page, tipo, attempt: i + 2 }, "Reintentando página leermangaesp");
            await sleep(2000 * (i + 1));
        }
    }
}

async function fetchMetadata(originalSlug, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(
                `${BASE_URL}/manga/${originalSlug}/`,
                { timeout: 30000 },
            );
            const $ = cheerio.load(data);

            const summary = $("#synopsis-text").text().trim() || null;

            const statusRaw = $("#info-block .info-value").text().trim();
            const status = STATUS_MAP[statusRaw] ?? null;

            const genres = [];
            $(".info-generos .genero-item").each((_, el) => {
                const g = $(el).text().trim();
                if (g) genres.push(g);
            });

            let cover = null;
            const rel = $("body").attr("data-portada-rel");
            const abs = $(".manga-cover img").attr("src");
            for (const candidate of [rel && buildCoverUrl(rel), abs && buildCoverUrl(abs)].filter(Boolean)) {
                if (await verifyUrl(candidate)) {
                    cover = candidate;
                    break;
                }
            }

            return { summary, status, genres, cover };
        } catch {
            if (i === retries - 1) return null;
            logger.warn({ originalSlug, attempt: i + 2 }, "Reintentando metadata leermangaesp");
            await sleep(2000 * (i + 1));
        }
    }
}

async function processSeries(seriesData, providerId, tipo) {
    const externalId = String(seriesData.id);
    const originalSlug = seriesData.slug;
    const slug = `leermangaesp-${externalId}`;
    const name = seriesData.titulo;
    const type = TYPE_MAP[tipo.toLowerCase()] ?? tipo;

    const existing = await prisma.providerSeries.findUnique({
        where: { providerId_externalId: { providerId, externalId } },
    });
    if (existing) {
        if (existing.url !== originalSlug) {
            await prisma.providerSeries.update({
                where: { id: existing.id },
                data: { url: originalSlug },
            });
        }
        logger.debug({ externalId }, "Ya existe en leermangaesp");
        return;
    }

    let resolved = await resolveCanonicalSeries(name, "olympus");
    if (!resolved) {
        resolved = await resolveCanonicalSeries(name, "manhwaweb");
    }
    if (!resolved) {
        const normalized = normalizeSeriesName(name);
        const candidates = await prisma.series.findMany({
            where: {
                providerSeries: {
                    some: {
                        provider: { name: { in: ["olympus", "manhwaweb"] } },
                    },
                },
            },
            select: { id: true, name: true, type: true },
            take: 5000,
        });
        for (const s of candidates) {
            if (normalizeSeriesName(s.name) === normalized) {
                resolved = { series: s, method: "normalized_broad" };
                logger.info(
                    { name, canonicalName: s.name, method: "normalized_broad" },
                    "Serie vinculada por fallback normalizado",
                );
                break;
            }
        }
    }

    const metadata = await fetchMetadata(originalSlug);

    const cover = buildCoverUrl(seriesData.portada);
    const chapterCount = Math.floor(seriesData.ultimo_capitulo ?? 0);

    const genres = metadata?.genres?.length
        ? metadata.genres
        : (seriesData.generos ?? []);
    const status = metadata?.status ?? null;
    const summary = metadata?.summary ?? null;

    try {
        const updatedSeries = await prisma.$transaction(async (tx) => {
            const s = await tx.series.upsert({
                where: { slug },
                create: {
                    name,
                    slug,
                    cover,
                    status,
                    summary,
                    chapterCount,
                    type,
                    metadataFetchedAt: metadata ? new Date() : null,
                },
                update: {
                    name,
                    cover,
                    status,
                    chapterCount,
                    type,
                    summary: summary ?? undefined,
                    metadataFetchedAt: metadata ? new Date() : undefined,
                },
            });

            if (genres.length) {
                await syncGenres(s.id, genres, tx);
            }

            await tx.providerSeries.upsert({
                where: { providerId_externalId: { providerId, externalId } },
                create: {
                    providerId,
                    seriesId: s.id,
                    externalId,
                    slug,
                    url: originalSlug,
                },
                update: {
                    seriesId: s.id,
                    slug,
                    url: originalSlug,
                },
            });

            return s;
        });

        if (resolved) {
            await createSeriesRelation(resolved.series.id, updatedSeries.id);
            logger.info(
                { name, method: resolved.method, canonicalSeries: resolved.series.name, newSeriesId: updatedSeries.id },
                "Serie leermangaesp creada con relación a olympus",
            );
        } else {
            logger.info({ type, name, seriesId: updatedSeries.id }, "Serie leermangaesp creada sin relación");
        }
    } catch (error) {
        logger.error({ externalId, err: error.message }, "Error procesando serie leermangaesp");
    }
}

async function scrapeByTipo(tipo, providerId) {
    logger.info({ tipo }, "Scrapeando tipo leermangaesp");

    const firstPage = await fetchPage(1, tipo);
    const totalPages = firstPage.totalPages;

    await Promise.all(
        firstPage.series.map((s) => limit(() => processSeries(s, providerId, tipo))),
    );

    for (let page = 2; page <= totalPages; page++) {
        const pageData = await fetchPage(page, tipo);
        await Promise.all(
            pageData.series.map((s) => limit(() => processSeries(s, providerId, tipo))),
        );
        await sleep(400);
    }

    logger.info({ tipo, total: totalPages }, "Tipo completado leermangaesp");
}

export async function scrapeSeries() {
    logger.info("LeerMangaEsp - Series + metadata incremental...");

    const provider = await prisma.provider.findUnique({
        where: { name: "leermangaesp" },
    });

    if (!provider) {
        throw new Error("Provider leermangaesp no existe — crealo en la BD primero");
    }

    await syncManualAliases(MANUAL_ALIASES, "olympus");

    await Promise.all([
        scrapeByTipo("Manga", provider.id),
        scrapeByTipo("Manhwa", provider.id),
        scrapeByTipo("Manhua", provider.id),
    ]);

    logger.info("LeerMangaEsp - Todas las series listas");
}
