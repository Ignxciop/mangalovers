import { prisma } from "../../config/prisma.js";
import { runOlympus } from "./olympus/olympus.js";
import { runManhwaweb } from "./manhwaweb/manhwaweb.js";
import { runLeermangaesp } from "./leermangaesp/leermangaesp.js";
import logger from "../../config/logger.js";

const PROVIDER_RUNNERS = {
  olympus: runOlympus,
  manhwaweb: runManhwaweb,
  leermangaesp: runLeermangaesp,
};

const ACTIVE_PROVIDERS = ["olympus", "manhwaweb", "leermangaesp"];

let _isRunning = false;

export function isRunning() {
  return _isRunning;
}

async function snapshotCounts() {
  const [series, chapters, pages] = await Promise.all([
    prisma.series.count(),
    prisma.chapter.count(),
    prisma.page.count(),
  ]);
  return { series, chapters, pages };
}

async function trackRun(provider, fn, triggeredBy = "cron") {
  const run = await prisma.scraperRun.create({
    data: { provider, status: "running", triggeredBy },
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

export async function runAllScrapers(triggeredBy = "cron") {
  if (_isRunning) {
    logger.warn("Scraper ya en ejecución, se omite esta corrida");
    return;
  }

  try {
    _isRunning = true;

    logger.info({ triggeredBy }, "Iniciando scraping global...");

    await trackRun("olympus", runOlympus, triggeredBy);
    await trackRun("manhwaweb", runManhwaweb, triggeredBy);
    await trackRun("leermangaesp", runLeermangaesp, triggeredBy);

    logger.info("Scraping global terminado");
  } catch (error) {
    logger.error({ err: error }, "Error en scraping global");
  } finally {
    _isRunning = false;
  }
}

export async function runSingleProvider(provider, triggeredBy = "cron") {
  if (_isRunning) {
    throw Object.assign(new Error("El scraper ya está en ejecución"), { statusCode: 409 });
  }

  const runner = PROVIDER_RUNNERS[provider];
  if (!runner) {
    throw Object.assign(new Error(`Proveedor desconocido: ${provider}`), { statusCode: 400 });
  }

  try {
    _isRunning = true;
    await trackRun(provider, runner, triggeredBy);
  } finally {
    _isRunning = false;
  }
}
