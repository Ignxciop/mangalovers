import axios from "axios";
import * as cheerio from "cheerio";
import pLimit from "p-limit";
import { prisma } from "../config/prisma.js";
import logger from "../config/logger.js";
import {
    normalizeSeriesName,
    createSeriesRelation,
} from "../manga/scrapers/seriesMatcher.js";

const BASE_URL = "https://leermangaesp.net";
const CDN_URL = "https://images.leermangaesp.net/file/leermangaesp";
const limit = pLimit(10);

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

async function fixStatusAndLinking() {
    logger.info("Corrigiendo status y vinculación de series leermangaesp...");

    const provider = await prisma.provider.findUnique({
        where: { name: "leermangaesp" },
    });
    if (!provider) {
        logger.error("Provider leermangaesp no encontrado");
        return;
    }

    const providerSeriesList = await prisma.providerSeries.findMany({
        where: { providerId: provider.id },
        select: {
            id: true,
            externalId: true,
            seriesId: true,
            url: true,
            series: { select: { id: true, name: true, status: true } },
        },
    });

    logger.info({ count: providerSeriesList.length }, "Series leermangaesp encontradas");

    const [olympusSeries, manhwawebSeries] = await Promise.all([
        prisma.series.findMany({
            where: { providerSeries: { some: { provider: { name: "olympus" } } } },
            select: { id: true, name: true },
            take: 5000,
        }),
        prisma.series.findMany({
            where: { providerSeries: { some: { provider: { name: "manhwaweb" } } } },
            select: { id: true, name: true },
            take: 5000,
        }),
    ]);

    const canonicalMap = new Map();
    for (const s of olympusSeries) {
        canonicalMap.set(normalizeSeriesName(s.name), { id: s.id, name: s.name, provider: "olympus" });
    }
    for (const s of manhwawebSeries) {
        const key = normalizeSeriesName(s.name);
        if (!canonicalMap.has(key)) {
            canonicalMap.set(key, { id: s.id, name: s.name, provider: "manhwaweb" });
        }
    }

    let linked = 0;
    let statusFixed = 0;
    let skippedStatusFetch = 0;

    async function processOne(ps) {
        const originalSlug = ps.url;
        const seriesName = ps.series?.name;

        try {
            // Phase 1: linking (no HTTP)
            const existingRelation = await prisma.seriesRelation.findFirst({
                where: {
                    OR: [
                        { primarySeriesId: ps.seriesId },
                        { fallbackSeriesId: ps.seriesId },
                    ],
                },
            });

            if (!existingRelation && seriesName) {
                const normalized = normalizeSeriesName(seriesName);
                const candidate = canonicalMap.get(normalized);
                if (candidate && candidate.id !== ps.seriesId) {
                    await createSeriesRelation(candidate.id, ps.seriesId);
                    logger.info(
                        { name: seriesName, canonicalName: candidate.name, provider: candidate.provider },
                        "Vinculación creada",
                    );
                    linked++;
                }
            }

            // Phase 2: status correction (HTTP solo si status es null o inválido)
            const currentStatus = ps.series?.status;
            if (currentStatus && currentStatus !== "Activo" && currentStatus !== "Finalizado"
                && currentStatus !== "En pausa" && currentStatus !== "Abandonado por el scan") {
                // Status inválido, necesita fetch
            } else if (currentStatus) {
                skippedStatusFetch++;
                return;
            }

            const { data: html } = await axios.get(
                `${BASE_URL}/manga/${originalSlug}/`,
                { timeout: 30000 },
            );
            const $ = cheerio.load(html);

            const statusRaw = $("#info-block .info-value").text().trim();
            const status = STATUS_MAP[statusRaw] ?? null;

            if (status && status !== currentStatus) {
                const summary = $("#synopsis-text").text().trim() || null;
                let cover = $("body").attr("data-portada-rel") || null;
                if (!cover) cover = $(".manga-cover img").attr("src") || null;
                cover = buildCoverUrl(cover);

                await prisma.series.update({
                    where: { id: ps.seriesId },
                    data: { status, summary, cover, metadataFetchedAt: new Date() },
                });
                statusFixed++;
                logger.info({ name: seriesName, status, oldStatus: currentStatus }, "Status corregido");
            }
        } catch (error) {
            logger.error({ slug: originalSlug, err: error.message }, "Error procesando serie");
        }
    }

    await Promise.all(
        providerSeriesList.map((ps) => limit(() => processOne(ps))),
    );

    logger.info({ statusFixed, linked, skippedStatusFetch }, "Fix de status y vinculación completado");
}

async function fixChapterNames() {
    logger.info("Corrigiendo nombres de capítulos con .00...");

    const result = await prisma.$executeRawUnsafe(`
        UPDATE "Chapter"
        SET name = regexp_replace(name, '\\.0+$', '')
        WHERE id IN (
            SELECT pc."chapterId"
            FROM "ProviderChapter" pc
            JOIN "Provider" p ON p.id = pc."providerId"
            WHERE p.name = $1
        )
        AND name ~ '\\.0+$'
    `, "leermangaesp");

    logger.info({ fixed: result }, "Nombres de capítulos corregidos");
}

async function main() {
    await fixStatusAndLinking();
    await fixChapterNames();
    await prisma.$disconnect();
}

main().catch((e) => {
    logger.error({ err: e }, "Error en fix-leermangaesp");
    prisma.$disconnect();
    process.exit(1);
});
