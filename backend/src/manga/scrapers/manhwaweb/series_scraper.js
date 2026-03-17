import axios from "axios";
import pLimit from "p-limit";
import { prisma } from "../../../config/prisma.js";
import { normalizeGenre } from "../normalizeGenre.js";

const limit = pLimit(1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BASE_URL = "https://manhwawebbackend-production.up.railway.app";

const STATUS_MAP = {
    publicandose: "Activo",
    finalizado: "Finalizado",
    hiatus: "Pausado por el autor (Hiatus)",
    abandonado: "Abandonado por el scan",
};
const MANUAL_ALIASES = [
    {
        olympusName: "El asesino yu ijin",
        manhwawebName: "Alistamiento mercenario",
    },
    {
        olympusName: "Aragi Kai, el Asesino en el Mundo Paralelo",
        manhwawebName:
            "El Asesino mas fuerte es transferido a otro mundo con toda su clase",
    },
    {
        olympusName: "Restaurante del mago",
        manhwawebName: "El Restaurante del Archimago",
    },
    {
        olympusName: "El villano de mirada cortante de la Academia Demoniaca",
        manhwawebName: "El villano de mirada cortante en la Academia Demoniaca",
    },
    {
        olympusName:
            "Me convertí en el villano con el que la heroína está obsesionada",
        manhwawebName:
            "Me convertí en el villano con el que la heroe esta obsesionada",
    },
    {
        olympusName: "El Señor de Hielo",
        manhwawebName: "Señor Del Hielo",
    },
    {
        olympusName: "El Rey Demonio Abrumado por Héroes",
        manhwawebName: "El rey demonio es superado por los héroes",
    },
    {
        olympusName: "apocalipsis zombie 82 08",
        manhwawebName: "Apocalipsis Zombi 82-08",
    },
];

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
            console.warn(
                `Reintentando página ${page} tipo=${tipo} (intento ${i + 2})...`,
            );
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

async function processSeries(seriesData, providerId, tipo) {
    const externalId = seriesData.real_id ?? seriesData._id;
    const slug = `manhwaweb-${externalId}`;

    // 0. Si ya existe este providerSeries, saltar
    const existing = await prisma.providerSeries.findUnique({
        where: { providerId_externalId: { providerId, externalId } },
    });
    if (existing) {
        console.log(`↷ Ya existe: ${externalId}`);
        return;
    }

    const name = seriesData.the_real_name ?? seriesData.name_esp ?? externalId;

    // 1. Buscar por nombre exacto en olympus
    const existingInOlympus = await prisma.series.findFirst({
        where: {
            name: { equals: name, mode: "insensitive" },
            providerSeries: {
                some: { provider: { name: "olympus" } },
            },
        },
        select: { id: true, type: true },
    });

    if (existingInOlympus) {
        if (!existingInOlympus.type) {
            await prisma.series.update({
                where: { id: existingInOlympus.id },
                data: { type: tipo },
            });
        }
        const existingLink = await prisma.providerSeries.findUnique({
            where: {
                providerId_seriesId: {
                    providerId,
                    seriesId: existingInOlympus.id,
                },
            },
        });
        if (!existingLink) {
            await prisma.providerSeries.create({
                data: {
                    providerId,
                    seriesId: existingInOlympus.id,
                    externalId,
                    slug,
                },
            });
        }
        console.log(`↷ Vinculado a olympus (nombre): ${name}`);
        return;
    }

    // 2. Buscar por alias manual
    const alias = await prisma.seriesAlias.findUnique({
        where: { alias: name.toLowerCase() },
        include: { series: { select: { id: true, type: true, name: true } } },
    });

    if (alias) {
        if (!alias.series.type) {
            await prisma.series.update({
                where: { id: alias.seriesId },
                data: { type: tipo },
            });
        }
        const existingLink = await prisma.providerSeries.findUnique({
            where: {
                providerId_seriesId: {
                    providerId,
                    seriesId: alias.seriesId,
                },
            },
        });
        if (!existingLink) {
            await prisma.providerSeries.create({
                data: {
                    providerId,
                    seriesId: alias.seriesId,
                    externalId,
                    slug,
                },
            });
        }
        console.log(
            `↷ Vinculado por alias: "${name}" → "${alias.series.name}"`,
        );
        return;
    }

    // 3. Crear serie nueva
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
    const chapterCount = seriesData._numero_cap ?? 0;
    const summary = metadata?._sinopsis ?? null;
    const rawType = seriesData._tipo ?? tipo ?? null;
    const type = rawType === "comic" ? "manga" : rawType;

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
                update: {
                    seriesId: updatedSeries.id,
                    slug,
                },
            });
        });

        console.log(`✓ [${type ?? "?"}] ${name}`);
    } catch (error) {
        console.error(`Error procesando serie ${externalId}:`, error.message);
    }
}

async function scrapeByTipo(tipo, providerId) {
    console.log(`\n── Scrapeando tipo: ${tipo} ──`);
    let page = 0;
    let hasNext = true;
    let total = 0;

    while (hasNext) {
        console.log(`[${tipo}] Página ${page}...`);
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

    console.log(`[${tipo}] Listo — ${total} series procesadas`);
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

    // Sincronizar aliases manuales
    console.log("Sincronizando aliases manuales...");
    for (const { olympusName, manhwawebName } of MANUAL_ALIASES) {
        const series = await prisma.series.findFirst({
            where: {
                name: { equals: olympusName, mode: "insensitive" },
                providerSeries: { some: { provider: { name: "olympus" } } },
            },
            select: { id: true },
        });
        if (!series) {
            console.warn(`Alias no encontrado en olympus: "${olympusName}"`);
            continue;
        }
        await prisma.seriesAlias.upsert({
            where: { alias: manhwawebName.toLowerCase() },
            create: { seriesId: series.id, alias: manhwawebName.toLowerCase() },
            update: {},
        });
        console.log(`✓ Alias: "${manhwawebName}" → "${olympusName}"`);
    }

    await Promise.all([
        scrapeByTipo("manga", provider.id),
        scrapeByTipo("manhwa", provider.id),
    ]);

    console.log("\nManhwaWeb - Todas las series listas");

    // Scrapear manga y manhwa en paralelo
    await Promise.all([
        scrapeByTipo("manga", provider.id),
        scrapeByTipo("manhwa", provider.id),
    ]);

    console.log("\nManhwaWeb - Todas las series listas");
}
