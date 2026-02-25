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

    // ← faltaba esta línea
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
                where: { providerId_externalId: { providerId, externalId } },
                create: {
                    providerId,
                    seriesId: updatedSeries.id,
                    externalId,
                    slug,
                },
                update: { seriesId: updatedSeries.id, slug },
            });
        });

        console.log(`✓ ${name}`);
    } catch (error) {
        console.error(`Error procesando serie ${externalId}:`, error.message);
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
