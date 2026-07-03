import { prisma } from "../config/prisma.js";
import logger from "../config/logger.js";

async function getProviderId(name) {
  const p = await prisma.provider.findUnique({ where: { name } });
  return p?.id ?? null;
}

async function seriesWithOlympus(tx, providerId) {
  const rows = await tx.$queryRawUnsafe(
    `SELECT ps."seriesId" FROM "ProviderSeries" ps
     JOIN "Provider" p ON p.id = ps."providerId"
     WHERE p.name = 'olympus'
     AND ps."seriesId" IN (
       SELECT "seriesId" FROM "ProviderSeries" WHERE "providerId" = $1
     )`,
    providerId,
  );
  return new Set(rows.map((r) => r.seriesId));
}

async function clusterSrcIds(tx, providerId) {
  const rows = await tx.$queryRawUnsafe(
    `SELECT sr."primarySeriesId" AS src
     FROM "series_relations" sr
     JOIN "ProviderSeries" ps ON ps."seriesId" = sr."primarySeriesId" AND ps."providerId" = $1
     JOIN "ProviderSeries" ps2 ON ps2."seriesId" = sr."fallbackSeriesId"
     JOIN "Provider" p ON p.id = ps2."providerId"
     WHERE p.name = 'leermangaesp'`,
    providerId,
  );
  return new Set(rows.map((r) => r.src));
}

async function soloSeries(tx, providerId, hasOlympusIds, clusteredIds) {
  const excluded = new Set([...hasOlympusIds, ...clusteredIds]);
  if (excluded.size === 0) {
    const rows = await tx.$queryRawUnsafe(
      `SELECT "seriesId" FROM "ProviderSeries" WHERE "providerId" = $1`,
      providerId,
    );
    return rows.map((r) => r.seriesId);
  }
  const ids = [...excluded];
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(",");
  const rows = await tx.$queryRawUnsafe(
    `SELECT "seriesId" FROM "ProviderSeries" WHERE "providerId" = $1 AND "seriesId" NOT IN (${placeholders})`,
    providerId,
    ...ids,
  );
  return rows.map((r) => r.seriesId);
}

async function cleanupManhwaweb() {
  logger.info("╔══════════════════════════════════════╗");
  logger.info("║     CLEANUP MANHWAWEB — INICIO      ║");
  logger.info("╚══════════════════════════════════════╝");

  const mwId = await getProviderId("manhwaweb");
  if (!mwId) {
    logger.warn("Provider manhwaweb no encontrado. Nada que limpiar.");
    return;
  }
  logger.info({ providerId: mwId }, "Provider manhwaweb encontrado");

  await prisma.$transaction(
    async (tx) => {
      const hasOlympusIds = await seriesWithOlympus(tx, mwId);
      const clusteredIds = await clusterSrcIds(tx, mwId);
      const soloIds = await soloSeries(tx, mwId, hasOlympusIds, clusteredIds);

      const totalMw = hasOlympusIds.size + clusteredIds.size + soloIds.length;
      logger.info({ total: totalMw }, "Total series con manhwaweb");

      if (hasOlympusIds.size > 0) {
        logger.info({ count: hasOlympusIds.size }, "Series con olympus — remover link manhwaweb");
      }
      if (clusteredIds.size > 0) {
        logger.info({ count: clusteredIds.size }, "Series en cluster — NO se tocan");
      }
      if (soloIds.length > 0) {
        logger.info({ count: soloIds.length }, "Series solo manhwaweb — eliminar");
      }

      if (totalMw === 0) {
        logger.warn("No hay series vinculadas a manhwaweb.");
        return;
      }

      // ── 1. Series solo manhwaweb ──
      if (soloIds.length > 0) {
        const placeholders = soloIds.map((_, i) => `$${i + 1}`).join(",");
        await tx.$executeRawUnsafe(
          `DELETE FROM "SeriesGenre" WHERE "seriesId" IN (${placeholders})`,
          ...soloIds,
        );
        logger.info({ count: soloIds.length }, "SeriesGenre eliminados");

        for (const id of soloIds) {
          await tx.$executeRawUnsafe(`DELETE FROM "Series" WHERE id = $1`, id);
        }
        logger.info({ count: soloIds.length }, "Series solo manhwaweb eliminadas");
      }

      // ── 2. Series con olympus — remover solo links manhwaweb ──
      if (hasOlympusIds.size > 0) {
        const ids = [...hasOlympusIds];
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");

        await tx.$executeRawUnsafe(
          `DELETE FROM "ProviderChapter" WHERE "providerId" = $1 AND "chapterId" IN (
            SELECT id FROM "Chapter" WHERE "seriesId" IN (${placeholders})
          )`,
          mwId,
          ...ids,
        );
        await tx.$executeRawUnsafe(
          `DELETE FROM "ProviderSeries" WHERE "providerId" = $1 AND "seriesId" IN (${placeholders})`,
          mwId,
          ...ids,
        );
        logger.info({ count: hasOlympusIds.size }, "Links manhwaweb removidos de series con olympus");
      }

      // ── 3. Series en cluster — NO se toca NADA ──

      // ── 4. ScraperRun ──
      await tx.$executeRawUnsafe(
        `DELETE FROM "scraper_runs" WHERE provider = 'manhwaweb'`,
      );

      // ── 5. ScraperConfig — deshabilitar manhwaweb ──
      await tx.$executeRawUnsafe(
        `UPDATE "scraper_config"
         SET "enabledProviders" = (
           SELECT COALESCE(jsonb_agg(elem::text)::json, '[]'::json)
           FROM jsonb_array_elements_text("enabledProviders") AS elem
           WHERE elem != 'manhwaweb'
         )`,
      );

      // ── 6. Provider — solo si ya no hay ProviderSeries que lo referencien ──
      const remaining = await tx.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS cnt FROM "ProviderSeries" WHERE "providerId" = $1`,
        mwId,
      );
      if (remaining[0].cnt > 0) {
        logger.warn(
          { remainingLinks: remaining[0].cnt },
          "Provider manhwaweb NO se elimina — aún referenciado por series en cluster",
        );
      } else {
        await tx.provider.delete({ where: { id: mwId } });
        logger.info("Provider manhwaweb eliminado");
      }
    },
    { timeout: 1800000 },
  );

  logger.info("╔══════════════════════════════════════╗");
  logger.info("║     CLEANUP MANHWAWEB — COMPLETADO  ║");
  logger.info("╚══════════════════════════════════════╝");
}

cleanupManhwaweb().catch((e) => {
  logger.error({ err: e }, "Error en cleanup de manhwaweb");
  process.exit(1);
});
