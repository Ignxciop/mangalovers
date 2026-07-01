import { prisma } from "../config/prisma.js";
import logger from "../config/logger.js";

// ─── helpers ────────────────────────────────────────────────
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

async function clusterPairs(tx, providerId) {
  // manhwaweb como primary → leermangaesp como fallback
  const rows = await tx.$queryRawUnsafe(
    `SELECT sr."primarySeriesId" AS src, sr."fallbackSeriesId" AS tgt
     FROM "SeriesRelation" sr
     JOIN "ProviderSeries" ps ON ps."seriesId" = sr."primarySeriesId" AND ps."providerId" = $1
     JOIN "ProviderSeries" ps2 ON ps2."seriesId" = sr."fallbackSeriesId"
     JOIN "Provider" p ON p.id = ps2."providerId"
     WHERE p.name = 'leermangaesp'`,
    providerId,
  );
  return rows;
}

async function soloSeries(tx, providerId, hasOlympusIds, clusteredSrcIds) {
  const excluded = new Set([...hasOlympusIds, ...clusteredSrcIds]);
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

// ─── main ───────────────────────────────────────────────────
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

  // ── ANÁLISIS ──────────────────────────────────────────
  await prisma.$transaction(
    async (tx) => {
      // Identificar categorías
      const hasOlympusIds = await seriesWithOlympus(tx, mwId);
      const pairs = await clusterPairs(tx, mwId);
      const clusteredSrcIds = new Set(pairs.map((p) => p.src));
      const soloIds = await soloSeries(tx, mwId, hasOlympusIds, clusteredSrcIds);

      // Stats
      const totalMw = hasOlympusIds.size + clusteredSrcIds.size + soloIds.length;

      logger.info({ total: totalMw }, "Total series con manhwaweb");

      if (hasOlympusIds.size > 0) {
        logger.info({ count: hasOlympusIds.size }, "Series con olympus — no requieren migración");
      }
      if (pairs.length > 0) {
        logger.info({ count: pairs.length }, "Clusters manhwaweb → leermangaesp — migrar datos");
      }
      if (soloIds.length > 0) {
        logger.info({ count: soloIds.length }, "Series solo manhwaweb — borrar sin migración");
      }

      // Si no hay nada que migrar ni borrar, salir
      if (totalMw === 0) {
        logger.warn("No hay series vinculadas a manhwaweb. Solo cleanup final.");
        return { totalMw: 0, hasOlympusIds, pairs, soloIds };
      }

      return { totalMw, hasOlympusIds, pairs, soloIds };
    },
    { timeout: 60000 },
  );

  // ── EJECUCIÓN ─────────────────────────────────────────
  await prisma.$transaction(
    async (tx) => {
      const hasOlympusIds = await seriesWithOlympus(tx, mwId);
      const pairs = await clusterPairs(tx, mwId);
      const soloIds = await soloSeries(tx, mwId, hasOlympusIds, new Set(pairs.map((p) => p.src)));

      // ── 1. Migrar favoritos, reads, comments, progress ──
      for (const pair of pairs) {
        const { src: mwSeriesId, tgt: lmSeriesId } = pair;
        logger.info({ mwSeriesId, lmSeriesId }, "Migrando cluster");

        // UserFavorite
        const favMigrated = await tx.$executeRawUnsafe(
          `INSERT INTO "user_favorites" ("userId", "seriesId", "status", "createdAt")
           SELECT uf."userId", $2, uf."status", uf."createdAt"
           FROM "user_favorites" uf
           WHERE uf."seriesId" = $1
           AND NOT EXISTS (
             SELECT 1 FROM "user_favorites" uf2
             WHERE uf2."userId" = uf."userId" AND uf2."seriesId" = $2
           )`,
          mwSeriesId,
          lmSeriesId,
        );
        if (favMigrated > 0) logger.info({ mwSeriesId, lmSeriesId, count: favMigrated }, "Favoritos migrados");

        // UserChapterRead
        const readMigrated = await tx.$executeRawUnsafe(
          `INSERT INTO "user_chapter_reads" ("userId", "chapterId", "readAt", "createdAt")
           SELECT ucr."userId", lc.id, ucr."readAt", ucr."createdAt"
           FROM "user_chapter_reads" ucr
           JOIN "Chapter" mc ON mc.id = ucr."chapterId"
           JOIN "Chapter" lc ON lc."number" = mc."number" AND lc."seriesId" = $2
           WHERE mc."seriesId" = $1
           AND NOT EXISTS (
             SELECT 1 FROM "user_chapter_reads" ucr2
             WHERE ucr2."userId" = ucr."userId" AND ucr2."chapterId" = lc.id
           )`,
          mwSeriesId,
          lmSeriesId,
        );
        if (readMigrated > 0) logger.info({ mwSeriesId, lmSeriesId, count: readMigrated }, "Reads migrados");

        // UserChapterProgress
        const progMigrated = await tx.$executeRawUnsafe(
          `INSERT INTO "user_chapter_progress" ("userId", "chapterId", "progress", "updatedAt")
           SELECT ucp."userId", lc.id, ucp."progress", ucp."updatedAt"
           FROM "user_chapter_progress" ucp
           JOIN "Chapter" mc ON mc.id = ucp."chapterId"
           JOIN "Chapter" lc ON lc."number" = mc."number" AND lc."seriesId" = $2
           WHERE mc."seriesId" = $1
           AND NOT EXISTS (
             SELECT 1 FROM "user_chapter_progress" ucp2
             WHERE ucp2."userId" = ucp."userId" AND ucp2."chapterId" = lc.id
           )`,
          mwSeriesId,
          lmSeriesId,
        );
        if (progMigrated > 0) logger.info({ mwSeriesId, lmSeriesId, count: progMigrated }, "Progress migrados");

        // Comment — reasignar chapterId al capítulo equivalente en leermangaesp
        const commentMigrated = await tx.$executeRawUnsafe(
          `UPDATE "comments" c
           SET "chapterId" = lc.id
           FROM "Chapter" mc
           JOIN "Chapter" lc ON lc."number" = mc."number" AND lc."seriesId" = $2
           WHERE c."chapterId" = mc.id AND mc."seriesId" = $1`,
          mwSeriesId,
          lmSeriesId,
        );
        if (commentMigrated > 0) logger.info({ mwSeriesId, lmSeriesId, count: commentMigrated }, "Comments migrados");
      }

      // ── 2. SeriesGenre (no tiene cascade) ──
      const allMwIds = [...hasOlympusIds, ...pairs.map((p) => p.src), ...soloIds];
      if (allMwIds.length > 0) {
        const ids = allMwIds;
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
        const genresDeleted = await tx.$executeRawUnsafe(
          `DELETE FROM "SeriesGenre" WHERE "seriesId" IN (${placeholders})`,
          ...ids,
        );
        logger.info({ count: genresDeleted }, "SeriesGenre eliminados");
      }

      // ── 3. Borrar series vinculadas a manhwaweb ──
      //    (Cascade: → Chapter → Page, ProviderChapter, UserChapterRead,
      //               UserChapterProgress, Comment → CommentLike
      //               SeriesAlias, SeriesRelation, ProviderSeries, UserFavorite)
      //    ⚠ Series con olympus NO se borran — solo se remueve el link
      //    ⚠ las que ya migraron sus datos sí se borran
      for (const id of soloIds) {
        await tx.$executeRawUnsafe(`DELETE FROM "Series" WHERE id = $1`, id);
      }
      for (const pair of pairs) {
        await tx.$executeRawUnsafe(`DELETE FROM "Series" WHERE id = $1`, pair.src);
      }
      logger.info({ solo: soloIds.length, clustered: pairs.length }, "Series manhwaweb eliminadas");

      // ── 4. Series con olympus — solo remover link ProviderSeries/ProviderChapter ──
      if (hasOlympusIds.size > 0) {
        const ids = [...hasOlympusIds];
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");

        // Remover ProviderChapter de manhwaweb para capítulos de estas series
        await tx.$executeRawUnsafe(
          `DELETE FROM "ProviderChapter" WHERE "providerId" = $1 AND "chapterId" IN (
            SELECT id FROM "Chapter" WHERE "seriesId" IN (${placeholders})
          )`,
          mwId,
          ...ids,
        );
        // Remover ProviderSeries de manhwaweb
        await tx.$executeRawUnsafe(
          `DELETE FROM "ProviderSeries" WHERE "providerId" = $1 AND "seriesId" IN (${placeholders})`,
          mwId,
          ...ids,
        );
        logger.info({ count: hasOlympusIds.size }, "Links manhwaweb removidos de series con olympus (series intactas)");
      }

      // ── 5. Resto de ProviderChapter/ProviderSeries (por si quedó algo suelto) ──
      await tx.$executeRawUnsafe(
        `DELETE FROM "ProviderChapter" WHERE "providerId" = $1`,
        mwId,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "ProviderSeries" WHERE "providerId" = $1`,
        mwId,
      );

      // ── 6. ScraperRun ──
      await tx.$executeRawUnsafe(
        `DELETE FROM "scraper_runs" WHERE provider = 'manhwaweb'`,
      );

      // ── 7. ScraperConfig ──
      await tx.$executeRawUnsafe(
        `UPDATE "scraper_config"
         SET "enabledProviders" = (
           SELECT COALESCE(jsonb_agg(elem::text)::json, '[]'::json)
           FROM jsonb_array_elements_text("enabledProviders") AS elem
           WHERE elem != 'manhwaweb'
         )`,
      );

      // ── 8. Provider ──
      await tx.provider.delete({ where: { id: mwId } });
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
