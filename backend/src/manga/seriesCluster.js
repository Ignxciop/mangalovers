import { prisma } from "../config/prisma.js";

/**
 * Dado un seriesId, resuelve el cluster de series relacionadas vía SeriesRelation
 * y retorna la serie con mayor prioridad (primary) y el resto como fallbacks ordenados.
 */
/**
  * Recolecta recursivamente todos los IDs del cluster expandiendo por relaciones
  * hasta que no se encuentren nuevos miembros.
  */
async function collectClusterIds(seedId) {
  const allIds = new Set([seedId]);
  let prevSize = 0;
  while (allIds.size > prevSize) {
    prevSize = allIds.size;
    const rels = await prisma.seriesRelation.findMany({
      where: {
        OR: [
          { primarySeriesId: { in: [...allIds] } },
          { fallbackSeriesId: { in: [...allIds] } },
        ],
      },
      select: { primarySeriesId: true, fallbackSeriesId: true },
    });
    for (const rel of rels) {
      allIds.add(rel.primarySeriesId);
      allIds.add(rel.fallbackSeriesId);
    }
  }
  return [...allIds];
}

export async function resolveSeriesCluster(seriesId) {
  const allIds = await collectClusterIds(seriesId);

  const [seriesList, relations] = await Promise.all([
    prisma.series.findMany({
      where: { id: { in: allIds } },
      include: {
        providerSeries: { include: { provider: true } },
      },
    }),
    prisma.seriesRelation.findMany({
      where: {
        OR: [
          { primarySeriesId: { in: allIds } },
          { fallbackSeriesId: { in: allIds } },
        ],
      },
    }),
  ]);

  if (seriesList.length === 0) return null;

  const clusterMap = new Map(seriesList.map((s) => [s.id, s]));
  const clusterIds = [...clusterMap.keys()];

  const primaryIds = new Set(
    relations
      .filter((r) => clusterIds.includes(r.primarySeriesId))
      .map((r) => r.primarySeriesId),
  );
  const fallbackIds = new Set(
    relations
      .filter((r) => clusterIds.includes(r.fallbackSeriesId))
      .map((r) => r.fallbackSeriesId),
  );
  // El primary real es el que es primary en alguna relación pero NUNCA fallback (raíz de la cadena)
  const primaryId = [...clusterIds].find((id) => primaryIds.has(id) && !fallbackIds.has(id))
    ?? [...clusterIds].find((id) => primaryIds.has(id));

  const members = [...clusterMap.values()].map((s) => {
    const providerName = s.providerSeries?.[0]?.provider?.name ?? null;
    const priority = s.providerSeries?.[0]?.provider?.priority ?? 99;
    return { series: s, providerName, priority };
  });

  if (primaryId) {
    members.sort((a, b) => {
      const aIsPrimary = a.series.id === primaryId ? 0 : 1;
      const bIsPrimary = b.series.id === primaryId ? 0 : 1;
      return aIsPrimary - bIsPrimary || a.priority - b.priority || a.series.id - b.series.id;
    });
  } else {
    members.sort((a, b) => a.priority - b.priority || a.series.id - b.series.id);
  }

  const primary = members[0];
  const fallbacks = members.slice(1);

  return {
    primary: {
      id: primary.series.id,
      name: primary.series.name,
      slug: primary.series.slug,
      cover: primary.series.cover,
      status: primary.series.status,
      summary: primary.series.summary,
      type: primary.series.type,
      providerName: primary.providerName,
      providerSeries: primary.series.providerSeries.map((ps) => ({
        provider: ps.provider.name,
        externalSlug: ps.slug,
        externalUrl: ps.url,
      })),
    },
    fallbacks: fallbacks.map((f) => ({
      id: f.series.id,
      name: f.series.name,
      slug: f.series.slug,
      cover: f.series.cover,
      status: f.series.status,
      summary: f.series.summary,
      type: f.series.type,
      providerName: f.providerName,
      priority: f.priority,
      providerSeries: f.series.providerSeries.map((ps) => ({
        provider: ps.provider.name,
        externalSlug: ps.slug,
        externalUrl: ps.url,
      })),
    })),
    allIds: members.map((m) => m.series.id),
  };
}

/**
 * Resuelve el vecino canónico (prev/next) de un capítulo dentro de un cluster,
 * aplicando la MISMA regla de prioridad que usa getSeriesDetailBySlug para la
 * lista de capítulos: si el primary tiene una fila para el number más cercano,
 * esa gana (los capítulos duplicados entre providers se resuelven al primary).
 *
 * Pasos:
 *  1. Encuentra el `number` más cercano en la dirección pedida (sin filtrar
 *     por provider todavía).
 *  2. Dado ese number, busca PRIMERO la fila de Chapter del primary.
 *  3. Solo si el primary no tiene fila para ese number (hueco real, no
 *     duplicado), cae a buscar en el resto del cluster.
 *
 * Retorna { id, name } del capítulo vecino, o null si no existe.
 */
export async function resolveCanonicalNeighbor(
    searchIds,
    primarySeriesId,
    currentNumber,
    direction,
) {
    const isPrev = direction === "prev";

    const closest = await prisma.chapter.findFirst({
        where: {
            seriesId: { in: searchIds },
            number: isPrev ? { lt: currentNumber } : { gt: currentNumber },
        },
        orderBy: { number: isPrev ? "desc" : "asc" },
        select: { number: true },
    });

    if (!closest) return null;

    const primaryChapter = await prisma.chapter.findFirst({
        where: { seriesId: primarySeriesId, number: closest.number },
        select: { id: true, name: true },
    });
    if (primaryChapter) return primaryChapter;

    const fallbackIds = searchIds.filter((id) => id !== primarySeriesId);
    if (fallbackIds.length === 0) return null;

    return prisma.chapter.findFirst({
        where: { seriesId: { in: fallbackIds }, number: closest.number },
        select: { id: true, name: true },
    });
}

/**
 * Batch-resuelve fallbackCovers para un array de seriesIds.
 * Retorna Map<seriesId, coverUrl | null>.
 */
export async function batchResolveFallbackCovers(seriesIds) {
  if (!seriesIds.length) return new Map();

  const relations = await prisma.seriesRelation.findMany({
    where: {
      OR: [
        { primarySeriesId: { in: seriesIds } },
        { fallbackSeriesId: { in: seriesIds } },
      ],
    },
    include: {
      primarySeries: { select: { cover: true } },
      fallbackSeries: { select: { cover: true } },
    },
  });

  const result = new Map();
  for (const id of seriesIds) {
    for (const rel of relations) {
      if (rel.primarySeriesId === id && isValidHttpUrl(rel.fallbackSeries.cover)) {
        result.set(id, rel.fallbackSeries.cover);
        break;
      }
      if (rel.fallbackSeriesId === id && isValidHttpUrl(rel.primarySeries.cover)) {
        result.set(id, rel.primarySeries.cover);
        break;
      }
    }
  }
  return result;
}

function isValidHttpUrl(url) {
  if (!url || typeof url !== "string") return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * Dado un slug, resuelve el cluster. Si el slug es de un miembro no-primary,
 * retorna el primary como resolución. Útil para redirección / unificación.
 */
export async function resolvePrimaryBySlug(slug) {
  const series = await prisma.series.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!series) return null;

  return resolveSeriesCluster(series.id);
}
