import axios from "axios";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";

const limit = pLimit(1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BASE_URL = "https://manhwawebbackend-production.up.railway.app";

const STATUS_MAP = {
    publicandose: "Activo",
    finalizado: "Finalizado",
    hiatus: "Pausado por el autor (Hiatus)",
    abandonado: "Abandonado por el scan",
};

async function fetchPage(page, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(`${BASE_URL}/manhwa/library`, {
                params: {
                    buscar: "",
                    estado: "",
                    tipo: "manga",
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
            console.warn(`Reintentando página ${page} (intento ${i + 2})...`);
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

async function syncGenres(seriesId, genreNames, tx = prisma) {
    for (const name of genreNames) {
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
    const externalId = seriesData.real_id ?? seriesData._id;
    const slug = `manhwaweb-${externalId}`;

    const existing = await prisma.providerSeries.findUnique({
        where: { providerId_externalId: { providerId, externalId } },
    });
    if (existing) {
        console.log(`↷ Ya existe: ${externalId}`);
        return;
    }

    const metadata = await fetchMetadata(externalId);

    const genres =
        metadata?._categoris
            ?.map((cat) => {
                if (typeof cat === "object") return Object.values(cat)[0];
                return null;
            })
            .filter(Boolean) ?? [];

    const status = STATUS_MAP[seriesData._status] ?? seriesData._status ?? null;
    const cover = seriesData._imagen ?? null;
    const name = seriesData.the_real_name ?? seriesData.name_esp ?? externalId;
    const chapterCount = seriesData._numero_cap ?? 0;
    const summary = metadata?._sinopsis ?? null;

    try {
        await prisma.$transaction(async (tx) => {
            const updatedSeries = await tx.series.upsert({
                where: { slug },
                create: {
                    name,
                    slug,
                    cover,
                    status,
                    summary,
                    chapterCount,
                    metadataFetchedAt: metadata ? new Date() : null,
                },
                update: {
                    name,
                    cover,
                    status,
                    chapterCount,
                    summary: summary ?? undefined,
                    metadataFetchedAt: metadata ? new Date() : undefined,
                },
            });

            if (genres.length) {
                await syncGenres(updatedSeries.id, genres, tx);
            }

            await tx.providerSeries.upsert({
                where: {
                    providerId_externalId: { providerId, externalId },
                },
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

        console.log(`✓ ${name}`);
    } catch (error) {
        console.error(`Error procesando serie ${externalId}:`, error.message);
    }
}

export async function scrapeSeries() {
    console.log("ManhwaWeb - Series + metadata incremental...");

    const provider = await prisma.provider.findUnique({
        where: { name: "manhwaweb" },
    });

    if (!provider) {
        throw new Error(
            "Provider manhwaweb no existe — créalo en la BD primero",
        );
    }

    let page = 0;
    let hasNext = true;

    while (hasNext) {
        console.log(`Página ${page}...`);
        const pageData = await fetchPage(page);

        await Promise.all(
            pageData.series.map((s) =>
                limit(() => processSeries(s, provider.id)),
            ),
        );

        hasNext = pageData.hasNext;
        page++;
        await sleep(400);
    }

    console.log("ManhwaWeb - Series listas");
}
