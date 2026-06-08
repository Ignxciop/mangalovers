import axios from "axios";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";
import logger from "../../../config/logger.js";
import { syncGenres } from "../syncGenres.js";
import { MANUAL_ALIASES } from "../manualAliases.js";
import {
    syncManualAliases,
    resolveCanonicalSeries,
    createSeriesRelation,
} from "../seriesMatcher.js";
import { updateSeriesStatus } from "../resolveStatus.js";

const limit = pLimit(1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BASE_URL = "https://manhwawebbackend-production.up.railway.app";

const STATUS_MAP = {
    publicandose: "Activo",
    finalizado: "Finalizado",
    hiatus: "Pausado por el autor (Hiatus)",
    abandonado: "Abandonado por el scan",
};

async function fetchPage(page, tipo, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(`${BASE_URL}/manhwa/library`, {
                params: {
                    buscar: "",
                    estado: "",
                    tipo,
                    erotico: "no",
                    demografia: "",
                    order_item: "alfabetico",
                    order_dir: "desc",
                    page,
                    generes: "",
                },
                timeout: 30000,
            });
            return {
                series: data.data,
                hasNext: data.next === true,
            };
        } catch (error) {
            if (i === retries - 1) throw error;
            logger.warn({ page, tipo, attempt: i + 2 }, "Reintentando página manhwaweb");
            await sleep(2000 * (i + 1));
        }
    }
}

async function fetchMetadata(externalId, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(
                `${BASE_URL}/manhwa/see/${externalId}`,
                { timeout: 30000 },
            );
            return data;
        } catch (error) {
            if (i === retries - 1) return null;
            await sleep(2000 * (i + 1));
        }
    }
}

async function processSeries(seriesData, providerId, tipo) {
    const externalId = seriesData.real_id ?? seriesData._id;
    const slug = `manhwaweb-${externalId}`;
    const name = seriesData.the_real_name ?? seriesData.name_esp ?? externalId;
    const rawType = seriesData._tipo ?? tipo ?? null;
    const type = rawType === "comic" ? "manga" : rawType;

    const status = STATUS_MAP[seriesData._status] ?? seriesData._status ?? null;

    const existing = await prisma.providerSeries.findUnique({
        where: { providerId_externalId: { providerId, externalId } },
    });
    if (existing) {
        await updateSeriesStatus(existing.seriesId, status);
        logger.debug({ externalId }, "Ya existe en manhwaweb");
        return;
    }

    const resolved = await resolveCanonicalSeries(name, "olympus");

    const metadata = await fetchMetadata(externalId);

    const genres =
        metadata?._categoris
            ?.map((cat) => {
                if (typeof cat === "object") return Object.values(cat)[0];
                return null;
            })
            .filter(Boolean) ?? [];

    
    const cover = seriesData._imagen ?? null;
    const chapterCount = seriesData._numero_cap ?? 0;
    const summary = metadata?._sinopsis ?? null;

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
                },
                update: {
                    seriesId: s.id,
                    slug,
                },
            });

            return s;
        });

        if (resolved) {
            await createSeriesRelation(resolved.series.id, updatedSeries.id);
            logger.info(
                { name, method: resolved.method, canonicalSeries: resolved.series.name, newSeriesId: updatedSeries.id },
                "Serie manhwaweb creada con relación a olympus",
            );
        } else {
            logger.info({ type, name, seriesId: updatedSeries.id }, "Serie manhwaweb creada sin relación");
        }
    } catch (error) {
        logger.error({ externalId, err: error.message }, "Error procesando serie manhwaweb");
    }
}

async function scrapeByTipo(tipo, providerId) {
    logger.info({ tipo }, "Scrapeando tipo manhwaweb");
    let page = 0;
    let hasNext = true;
    let total = 0;

    while (hasNext) {
        logger.debug({ tipo, page }, "Página manhwaweb");
        const pageData = await fetchPage(page, tipo);

        await Promise.all(
            pageData.series.map((s) =>
                limit(() => processSeries(s, providerId, tipo)),
            ),
        );

        total += pageData.series.length;
        hasNext = pageData.hasNext;
        page++;
        await sleep(400);
    }

    logger.info({ tipo, total }, "Tipo completado manhwaweb");
}

export async function scrapeSeries() {
    logger.info("ManhwaWeb - Series + metadata incremental...");

    const provider = await prisma.provider.findUnique({
        where: { name: "manhwaweb" },
    });

    if (!provider) {
        throw new Error(
            "Provider manhwaweb no existe — crealo en la BD primero",
        );
    }

    await syncManualAliases(MANUAL_ALIASES, "olympus");

    await Promise.all([
        scrapeByTipo("manga", provider.id),
        scrapeByTipo("manhwa", provider.id),
        scrapeByTipo("manhua", provider.id),
    ]);

    logger.info("ManhwaWeb - Todas las series listas");
}
