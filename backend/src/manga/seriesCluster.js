import { prisma } from "../config/prisma.js";

/**
 * Dado un seriesId, resuelve el cluster de series relacionadas vía SeriesRelation
 * y retorna la serie con mayor prioridad (primary) y el resto como fallbacks ordenados.
 */
export async function resolveSeriesCluster(seriesId) {
  const series = await prisma.series.findUnique({
    where: { id: seriesId },
    include: {
      providerSeries: { include: { provider: true } },
      primaryRelations: { include: { fallbackSeries: { include: { providerSeries: { include: { provider: true } } } } } },
      fallbackRelations: { include: { primarySeries: { include: { providerSeries: { include: { provider: true } } } } } },
    },
  });

  if (!series) return null;

  // Armar cluster: la serie actual + todas las relacionadas
  const clusterMap = new Map();
  clusterMap.set(series.id, series);

  for (const rel of series.primaryRelations) {
    if (!clusterMap.has(rel.fallbackSeries.id)) {
      clusterMap.set(rel.fallbackSeries.id, rel.fallbackSeries);
    }
  }
  for (const rel of series.fallbackRelations) {
    if (!clusterMap.has(rel.primarySeries.id)) {
      clusterMap.set(rel.primarySeries.id, rel.primarySeries);
    }
  }

  // Determinar primary: la del cluster con provider de menor priority
  const members = [...clusterMap.values()].map((s) => {
    const providerName = s.providerSeries?.[0]?.provider?.name ?? null;
    const priority = s.providerSeries?.[0]?.provider?.priority ?? 99;
    return { series: s, providerName, priority };
  });

  members.sort((a, b) => a.priority - b.priority || a.series.id - b.series.id);

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
