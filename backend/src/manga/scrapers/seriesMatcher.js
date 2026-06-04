import { prisma } from "../../config/prisma.js";
import logger from "../../config/logger.js";

export function normalizeSeriesName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function syncManualAliases(manualAliases, canonicalProviderName) {
  logger.info("Sincronizando aliases manuales...");
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
      logger.warn({ canonical, provider: canonicalProviderName }, "Canonical no encontrado");
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

    logger.info({ canonical, count: aliases.length }, "Aliases sincronizados");
    synced++;
  }

  logger.info({ synced, total: manualAliases.length }, "Sincronización de aliases completada");
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

  const normalizedIncoming = normalizeSeriesName(incomingName);

  const canonicalSeries = await prisma.series.findMany({
    where: {
      providerSeries: {
        some: { provider: { name: canonicalProviderName } },
      },
    },
    select: { id: true, name: true, type: true },
  });

  for (const candidate of canonicalSeries) {
    if (normalizeSeriesName(candidate.name) === normalizedIncoming) {
      return { series: candidate, method: "normalized_exact" };
    }
  }

  return null;
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

export async function createSeriesRelation(
  seriesAId,
  seriesBId,
) {
  // Determinar primary según prioridad de provider
  const [seriesA, seriesB] = await Promise.all([
    prisma.series.findUnique({
      where: { id: seriesAId },
      select: {
        providerSeries: {
          select: { provider: { select: { id: true, priority: true } } },
          take: 1,
        },
      },
    }),
    prisma.series.findUnique({
      where: { id: seriesBId },
      select: {
        providerSeries: {
          select: { provider: { select: { id: true, priority: true } } },
          take: 1,
        },
      },
    }),
  ]);

  const priorityA = seriesA?.providerSeries?.[0]?.provider?.priority ?? 99;
  const priorityB = seriesB?.providerSeries?.[0]?.provider?.priority ?? 99;

  const [primarySeriesId, fallbackSeriesId] =
    priorityA <= priorityB ? [seriesAId, seriesBId] : [seriesBId, seriesAId];

  const existing = await prisma.seriesRelation.findUnique({
    where: {
      primarySeriesId_fallbackSeriesId: {
        primarySeriesId,
        fallbackSeriesId,
      },
    },
  });

  if (!existing) {
    await prisma.seriesRelation.create({
      data: {
        primarySeriesId,
        fallbackSeriesId,
      },
    });
    logger.info(
      { primarySeriesId, fallbackSeriesId, priorityA, priorityB },
      "SeriesRelation creada",
    );
  }
}
