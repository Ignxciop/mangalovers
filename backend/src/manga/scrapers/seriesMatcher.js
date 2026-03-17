import { prisma } from "../../config/prisma.js";

const LANGUAGE_STOPWORDS = new Set([
    "el",
    "la",
    "los",
    "las",
    "un",
    "una",
    "unos",
    "unas",
    "de",
    "del",
    "al",
    "en",
    "con",
    "por",
    "para",
    "que",
    "se",
    "su",
    "sus",
    "me",
    "mi",
    "mis",
    "y",
    "e",
    "o",
    "u",
    "a",
    "ante",
    "bajo",
    "desde",
    "entre",
    "hacia",
    "hasta",
    "sin",
    "sobre",
    "tras",
    "the",
    "an",
    "of",
    "in",
    "to",
]);

const DOMAIN_STOPWORDS = new Set([
    "sistema",
    "nivel",
    "clase",
    "rango",
    "stats",
    "puntos",
    "habilidad",
    "habilidades",
    "magia",
    "mago",
    "maga",
    "guerrero",
    "guerrera",
    "cazador",
    "cazadora",
    "jugador",
    "jugadora",
    "reencarnado",
    "reencarnada",
    "reencarnacion",
    "reencarnamiento",
    "transmigrado",
    "transmigrada",
    "transferido",
    "transferida",
    "regreso",
    "retorno",
    "sss",
    "ss",
    "legendario",
    "legendaria",
    "mitico",
    "epico",
    "supremo",
    "suprema",
    "maximo",
    "maxima",
    "ultimate",
    "villano",
    "villana",
    "heroe",
    "heroina",
    "rey",
    "reina",
    "principe",
    "princesa",
    "lord",
    "maestro",
    "maestra",
    "mundo",
    "nuevo",
    "nueva",
    "gran",
    "grande",
    "poderoso",
    "poderosa",
    "fuerte",
    "unico",
    "unica",
    "solo",
    "sola",
    "mejor",
    "peor",
    "vida",
    "segundo",
    "segunda",
]);

const ALL_STOPWORDS = new Set([...LANGUAGE_STOPWORDS, ...DOMAIN_STOPWORDS]);

const THRESHOLD_MERGE = 0.85;
const THRESHOLD_REVIEW = 0.65;
const MIN_TOKENS_FOR_MERGE = 3;
const MIN_SHARED_NON_GENERIC = 2;
const MAX_LENGTH_RATIO = 3.0;
const MIN_SUBSET_RATIO = 2.0;

function extractTokens(title) {
    return title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter((t) => t.length > 1 && !ALL_STOPWORDS.has(t));
}

export function normalizeSeriesName(name) {
    return extractTokens(name).sort().join(" ");
}

export function matchManga(titleA, titleB) {
    const tokensA = extractTokens(titleA);
    const tokensB = extractTokens(titleB);
    const setA = new Set(tokensA);
    const setB = new Set(tokensB);

    if (tokensA.length === 0 || tokensB.length === 0) {
        return {
            score: 0,
            decision: "reject",
            reason: "sin_tokens_significativos",
        };
    }

    if (tokensA.length <= 1 || tokensB.length <= 1) {
        return {
            score: 0,
            decision: "reject",
            reason: "titulo_demasiado_corto",
        };
    }

    const maxLen = Math.max(setA.size, setB.size);
    const minLen = Math.min(setA.size, setB.size);

    if (maxLen / minLen >= MAX_LENGTH_RATIO) {
        return {
            score: 0,
            decision: "reject",
            reason: "diferencia_longitud_extrema",
        };
    }

    const intersection = tokensA.filter((t) => setB.has(t));

    const isSubset =
        tokensA.every((t) => setB.has(t)) || tokensB.every((t) => setA.has(t));
    if (isSubset && maxLen / minLen >= MIN_SUBSET_RATIO) {
        return { score: 0, decision: "reject", reason: "subconjunto_estricto" };
    }

    const sharedNonGeneric = intersection.filter(
        (t) => !DOMAIN_STOPWORDS.has(t),
    );
    if (sharedNonGeneric.length === 0) {
        return {
            score: 0,
            decision: "reject",
            reason: "sin_tokens_discriminatorios_comunes",
        };
    }

    const unionSize = new Set([...tokensA, ...tokensB]).size;
    const jaccard = intersection.length / unionSize;

    const coverageA = intersection.length / setA.size;
    const coverageB = intersection.length / setB.size;
    const coverage = Math.min(coverageA, coverageB);

    const lengthPenalty = minLen / maxLen;

    const normalizedA = [...setA].sort().join(" ");
    const normalizedB = [...setB].sort().join(" ");
    const exactBonus = normalizedA === normalizedB ? 1.0 : 0.0;

    const score =
        jaccard * 0.5 +
        coverage * 0.3 +
        lengthPenalty * 0.15 +
        exactBonus * 0.05;

    if (score >= THRESHOLD_MERGE) {
        if (minLen < MIN_TOKENS_FOR_MERGE) {
            return {
                score,
                decision: "review",
                reason: "score_alto_pero_titulo_corto",
            };
        }
        if (sharedNonGeneric.length < MIN_SHARED_NON_GENERIC) {
            return {
                score,
                decision: "review",
                reason: "pocos_tokens_discriminatorios",
            };
        }
        return { score, decision: "merge", reason: "match_seguro" };
    }

    if (score >= THRESHOLD_REVIEW) {
        return {
            score,
            decision: "review",
            reason: "match_probable_verificar",
        };
    }

    return { score, decision: "reject", reason: "score_insuficiente" };
}

export async function syncManualAliases(manualAliases, canonicalProviderName) {
    console.log("Sincronizando aliases manuales...");
    let synced = 0;

    for (const { canonical, aliases } of manualAliases) {
        const series = await prisma.series.findFirst({
            where: {
                name: { equals: canonical, mode: "insensitive" },
                providerSeries: {
                    some: { provider: { name: canonicalProviderName } },
                },
            },
            select: { id: true },
        });

        if (!series) {
            console.warn(
                `Canonical no encontrado en ${canonicalProviderName}: "${canonical}"`,
            );
            continue;
        }

        for (const aliasValue of aliases) {
            await prisma.seriesAlias.upsert({
                where: { alias: aliasValue.toLowerCase() },
                create: {
                    seriesId: series.id,
                    alias: aliasValue.toLowerCase(),
                },
                update: {},
            });
        }

        console.log(`"${canonical}" — ${aliases.length} aliases sincronizados`);
        synced++;
    }

    console.log(`Aliases: ${synced}/${manualAliases.length} sincronizados\n`);
}

export async function resolveCanonicalSeries(
    incomingName,
    canonicalProviderName,
) {
    const alias = await prisma.seriesAlias.findUnique({
        where: { alias: incomingName.toLowerCase() },
        include: { series: { select: { id: true, name: true, type: true } } },
    });
    if (alias) return { series: alias.series, method: "alias" };

    const exactMatch = await prisma.series.findFirst({
        where: {
            name: { equals: incomingName, mode: "insensitive" },
            providerSeries: {
                some: { provider: { name: canonicalProviderName } },
            },
        },
        select: { id: true, name: true, type: true },
    });
    if (exactMatch) return { series: exactMatch, method: "exact" };

    const canonicalSeries = await prisma.series.findMany({
        where: {
            providerSeries: {
                some: { provider: { name: canonicalProviderName } },
            },
        },
        select: { id: true, name: true, type: true },
    });

    let bestResult = null;
    let bestScore = 0;

    for (const candidate of canonicalSeries) {
        if (
            normalizeSeriesName(candidate.name) ===
            normalizeSeriesName(incomingName)
        ) {
            return { series: candidate, method: "normalized_exact" };
        }

        const result = matchManga(incomingName, candidate.name);
        if (result.decision === "merge" && result.score > bestScore) {
            bestScore = result.score;
            bestResult = {
                series: candidate,
                method: `token_match (${(result.score * 100).toFixed(0)}%)`,
                score: result.score,
            };
        }
    }

    return bestResult;
}

export async function linkToCanonicalSeries(
    seriesId,
    providerId,
    externalId,
    slug,
    type,
) {
    const existingLink = await prisma.providerSeries.findUnique({
        where: { providerId_seriesId: { providerId, seriesId } },
    });

    if (!existingLink) {
        await prisma.providerSeries.create({
            data: { providerId, seriesId, externalId, slug },
        });
    }

    if (type) {
        const series = await prisma.series.findUnique({
            where: { id: seriesId },
            select: { type: true },
        });
        if (!series?.type) {
            await prisma.series.update({
                where: { id: seriesId },
                data: { type },
            });
        }
    }
}
