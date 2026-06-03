import { prisma } from "../../config/prisma.js";
import { runOlympus } from "./olympus/olympus.js";
import { runManhwaweb } from "./manhwaweb/manhwaweb.js";
import logger from "../../config/logger.js";

let isRunning = false;

async function snapshotCounts() {
  const [series, chapters, pages] = await Promise.all([
    prisma.series.count(),
    prisma.chapter.count(),
    prisma.page.count(),
  ]);
  return { series, chapters, pages };
}

async function trackRun(provider, fn) {
  const run = await prisma.scraperRun.create({
    data: { provider, status: "running" },
  });

  try {
    const before = await snapshotCounts();
    await fn();
    const after = await snapshotCounts();

    await prisma.scraperRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        finishedAt: new Date(),
        seriesProcessed: Math.max(0, after.series - before.series),
        chaptersCreated: Math.max(0, after.chapters - before.chapters),
        pagesScraped: Math.max(0, after.pages - before.pages),
      },
    });

    logger.info({ provider, id: run.id }, "ScraperRun completado");
  } catch (error) {
    await prisma.scraperRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errorMessage: error.message.slice(0, 500),
        errors: 1,
      },
    });

    logger.error({ provider, id: run.id, err: error.message }, "ScraperRun falló");
    throw error;
  }
}

export async function runAllScrapers() {
  if (isRunning) {
    logger.warn("Scraper ya en ejecución, se omite esta corrida");
    return;
  }

  try {
    isRunning = true;

    logger.info("Iniciando scraping global...");

    await trackRun("olympus", runOlympus);
    await trackRun("manhwaweb", runManhwaweb);

    logger.info("Scraping global terminado");
  } catch (error) {
    logger.error({ err: error }, "Error en scraping global");
  } finally {
    isRunning = false;
  }
}
