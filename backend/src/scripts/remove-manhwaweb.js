import { prisma } from "../config/prisma.js";
import logger from "../config/logger.js";

async function report() {
    const manhwaweb = await prisma.provider.findUnique({ where: { name: "manhwaweb" } });
    if (!manhwaweb) {
        logger.info("Provider manhwaweb no encontrado en DB. Nada que hacer.");
        process.exit(0);
    }

    const providerId = manhwaweb.id;

    const providerSeriesList = await prisma.providerSeries.findMany({
        where: { providerId },
        include: {
            series: {
                include: {
                    providerSeries: { where: { providerId: { not: providerId } } },
                    favorites: { take: 1 },
                },
            },
        },
    });

    const totalSeries = providerSeriesList.length;
    const hasOtherProvider = providerSeriesList.filter(ps => ps.series.providerSeries.length > 0);
    const manhwawebOnly = providerSeriesList.filter(ps => ps.series.providerSeries.length === 0);
    const withFavorites = manhwawebOnly.filter(ps => ps.series.favorites.length > 0);
    const withoutFavorites = manhwawebOnly.filter(ps => ps.series.favorites.length === 0);

    const totalPc = await prisma.providerChapter.count({ where: { providerId } });

    const orphanChapters = await prisma.chapter.count({
        where: {
            seriesId: { in: providerSeriesList.map(ps => ps.seriesId) },
            providerChapters: { none: {} },
        },
    });

    const totalReads = await prisma.userChapterRead.count({
        where: {
            chapter: {
                seriesId: { in: providerSeriesList.map(ps => ps.seriesId) },
                providerChapters: { some: { providerId } },
            },
        },
    });

    const seriesRelations = await prisma.seriesRelation.findMany({
        where: {
            OR: [
                { primarySeriesId: { in: providerSeriesList.map(ps => ps.seriesId) } },
                { fallbackSeriesId: { in: providerSeriesList.map(ps => ps.seriesId) } },
            ],
        },
    });

    logger.info("========== REPORTE PREVIO ==========");
    logger.info({ providerId }, "Provider manhwaweb encontrado");
    logger.info({ totalSeries }, "Series vinculadas a manhwaweb");
    logger.info({ hasOtherProvider: hasOtherProvider.length }, "Series con OTRO provider (se mantienen)");
    logger.info({ manhwawebOnly: manhwawebOnly.length }, "Series con SOLO manhwaweb");
    logger.info({ withFavorites: withFavorites.length }, "  → Con favoritos (NO se borran)");
    logger.info({ withoutFavorites: withoutFavorites.length }, "  → Sin favoritos (candidatas a eliminar)");
    logger.info({ totalPc }, "ProviderChapters a eliminar");
    logger.info({ orphanChapters }, "Capítulos huérfanos (sin provider) que pueden eliminarse");
    logger.info({ totalReads }, "Lecturas asociadas a capítulos manhwaweb");
    logger.info({ seriesRelations: seriesRelations.length }, "SeriesRelations a limpiar");

    if (manhwawebOnly.length > 0) {
        logger.info("Series que se quedarán sin provider:");
        for (const ps of manhwawebOnly) {
            const hasFav = ps.series.favorites.length > 0;
            logger.info(`  [${hasFav ? "FAV" : "   "}] ${ps.series.name} (id=${ps.series.id}, slug=${ps.series.slug})`);
        }
    }

    logger.info("====================================");
    logger.info("¿Ejecutar la limpieza? Revisa el reporte y confirma.");
    logger.info('Para ejecutar: node src/scripts/remove-manhwaweb.js --execute');

    return {
        providerId, providerSeriesList, hasOtherProvider, manhwawebOnly,
        withFavorites, withoutFavorites, seriesRelations,
    };
}

async function execute() {
    const manhwaweb = await prisma.provider.findUnique({ where: { name: "manhwaweb" } });
    if (!manhwaweb) {
        logger.info("Provider manhwaweb no encontrado. Nada que hacer.");
        return;
    }

    const providerId = manhwaweb.id;
    const seriesIds = (await prisma.providerSeries.findMany({
        where: { providerId },
        select: { seriesId: true },
    })).map(r => r.seriesId);

    logger.info({ seriesCount: seriesIds.length }, "Iniciando limpieza de manhwaweb...");

    await prisma.$transaction(async (tx) => {
        // 1. Eliminar provider_chapters
        const deletedPc = await tx.providerChapter.deleteMany({ where: { providerId } });
        logger.info({ deletedPc: deletedPc.count }, "ProviderChapters eliminados");

        // 2. Eliminar capítulos huérfanos (sin provider y sin lecturas)
        const orphanChapters = await tx.chapter.findMany({
            where: {
                seriesId: { in: seriesIds },
                providerChapters: { none: {} },
                reads: { none: {} },
                progress: { none: {} },
            },
            select: { id: true },
        });
        if (orphanChapters.length > 0) {
            const deletedCh = await tx.chapter.deleteMany({
                where: { id: { in: orphanChapters.map(c => c.id) } },
            });
            logger.info({ deletedChapters: deletedCh.count }, "Capítulos huérfanos sin lecturas eliminados");
        }

        // 3. Eliminar provider_series
        const deletedPs = await tx.providerSeries.deleteMany({ where: { providerId } });
        logger.info({ deletedPs: deletedPs.count }, "ProviderSeries eliminados");

        // 4. Eliminar series_relations que involucran series que solo tenían manhwaweb
        const soloManhwaIds = (await tx.providerSeries.findMany({
            where: { seriesId: { in: seriesIds } },
            select: { seriesId: true },
        })).map(r => r.seriesId);

        const relationsToDelete = await tx.seriesRelation.findMany({
            where: {
                OR: [
                    { primarySeriesId: { in: soloManhwaIds } },
                    { fallbackSeriesId: { in: soloManhwaIds } },
                ],
            },
            select: { id: true },
        });

        if (relationsToDelete.length > 0) {
            const deletedRel = await tx.seriesRelation.deleteMany({
                where: { id: { in: relationsToDelete.map(r => r.id) } },
            });
            logger.info({ deletedRelations: deletedRel.count }, "SeriesRelations eliminadas");
        }

        // 5. Eliminar series sin ningún provider y sin favoritos
        const allSeriesWithProvider = (await tx.providerSeries.findMany({
            select: { seriesId: true },
        })).map(r => r.seriesId);

        const seriesToDelete = await tx.series.findMany({
            where: {
                id: { in: soloManhwaIds, notIn: allSeriesWithProvider },
                favorites: { none: {} },
            },
            select: { id: true, name: true },
        });

        if (seriesToDelete.length > 0) {
            // Delete related records first
            const deleteIds = seriesToDelete.map(s => s.id);
            await tx.seriesGenre.deleteMany({ where: { seriesId: { in: deleteIds } } });
            await tx.chapter.deleteMany({
                where: { seriesId: { in: deleteIds }, userChapterReads: { none: {} } },
            });
            await tx.seriesAlias.deleteMany({ where: { seriesId: { in: deleteIds } } });
            await tx.series.deleteMany({ where: { id: { in: deleteIds } } });
            logger.info({ deletedSeries: seriesToDelete.length }, "Series eliminadas (sin provider, sin favoritos)");
            for (const s of seriesToDelete) {
                logger.info({ name: s.name, id: s.id }, "  → Serie eliminada");
            }
        }

        // 6. Actualizar scraper_config
        const config = await tx.scraperConfig.findFirst();
        if (config) {
            const providers = config.enabledProviders.filter(p => p !== "manhwaweb");
            await tx.scraperConfig.update({
                where: { id: config.id },
                data: { enabledProviders: providers },
            });
            logger.info("manhwaweb removido de enabledProviders en scraper_config");
        }

        // 7. Eliminar el provider manhwaweb
        await tx.provider.delete({ where: { id: providerId } });
        logger.info("Provider manhwaweb eliminado permanentemente");
    });

    logger.info("Limpieza completada exitosamente.");
}

async function main() {
    const args = process.argv.slice(2);

    if (args.includes("--execute")) {
        logger.info("=== MODO EJECUCIÓN ===");
        await execute();
    } else {
        logger.info("=== MODO REPORTE (dry-run) ===");
        logger.info("Ejecuta con --execute para aplicar los cambios.");
        await report();
    }
}

main().catch((e) => {
    logger.error({ err: e }, "Error en remove-manhwaweb");
    process.exit(1);
});