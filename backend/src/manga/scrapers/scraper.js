import { prisma } from "../../config/prisma.js";
import { runOlympus } from "./olympus/olympus.js";
import { runManhwaweb } from "./manhwaweb/manhwaweb.js";
import { runLeermangaesp } from "./leermangaesp/leermangaesp.js";
import { scrapePages as olympusScrapePages } from "./olympus/pages_scraper.js";
import { scrapePages as manhwawebScrapePages } from "./manhwaweb/pages_scraper.js";
import { scrapePages as leermangaespScrapePages } from "./leermangaesp/pages_scraper.js";
import { getAbortSignal, abortScraper, resetAbortSignal } from "./scraperAbort.js";
import logger from "../../config/logger.js";

const PROVIDER_RUNNERS = {
  olympus: runOlympus,
  manhwaweb: runManhwaweb,
  leermangaesp: runLeermangaesp,
};

const PAGES_ONLY_RUNNERS = {
  olympus: olympusScrapePages,
  manhwaweb: manhwawebScrapePages,
  leermangaesp: leermangaespScrapePages,
};

const ACTIVE_PROVIDERS = ["olympus", "manhwaweb", "leermangaesp"];

const _runningProviders = new Set();

export function isRunning(provider) {
  if (provider) return _runningProviders.has(provider);
  return _runningProviders.size > 0;
}

export function stopScraper(provider) {
  if (!_runningProviders.has(provider)) {
    throw Object.assign(new Error(`No hay scraper de ${provider} en ejecución`), { statusCode: 409 });
  }
  abortScraper(provider);
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

    const aborted = getAbortSignal(provider).aborted;

    await prisma.scraperRun.update({
      where: { id: run.id },
      data: {
        status: aborted ? "cancelled" : "success",
        finishedAt: new Date(),
        seriesProcessed: Math.max(0, after.series - before.series),
        chaptersCreated: Math.max(0, after.chapters - before.chapters),
        pagesScraped: Math.max(0, after.pages - before.pages),
      },
    });

    logger.info({ provider, id: run.id, status: aborted ? "cancelled" : "success" }, "ScraperRun finalizado");
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

export async function runAllScrapers(triggeredBy = "cron", providers = ACTIVE_PROVIDERS) {
  const toRun = providers.filter((p) => PROVIDER_RUNNERS[p]);
  if (toRun.length === 0) {
    logger.warn("No hay proveedores habilitados para ejecutar");
    return;
  }

  logger.info({ triggeredBy, providers: toRun }, "Iniciando scraping...");

  for (const provider of toRun) {
    if (_runningProviders.has(provider)) {
      logger.warn({ provider }, "Provider ya en ejecución, se omite");
      continue;
    }

    _runningProviders.add(provider);
    resetAbortSignal(provider);

    try {
      await trackRun(provider, PROVIDER_RUNNERS[provider], triggeredBy);
    } catch (error) {
      logger.error({ provider, err: error }, "Error en scraping");
    } finally {
      _runningProviders.delete(provider);
    }
  }

  logger.info("Scraping terminado");
}

export async function runSingleProvider(provider, triggeredBy = "cron") {
  if (_runningProviders.has(provider)) {
    throw Object.assign(new Error(`El scraper de ${provider} ya está en ejecución`), { statusCode: 409 });
  }

  const runner = PROVIDER_RUNNERS[provider];
  if (!runner) {
    throw Object.assign(new Error(`Proveedor desconocido: ${provider}`), { statusCode: 400 });
  }

  _runningProviders.add(provider);
  resetAbortSignal(provider);

  try {
    await trackRun(provider, runner, triggeredBy);
  } finally {
    _runningProviders.delete(provider);
  }
}

export async function runPagesOnly(provider, triggeredBy = "manual") {
  if (_runningProviders.has(provider)) {
    throw Object.assign(new Error(`El scraper de ${provider} ya está en ejecución`), { statusCode: 409 });
  }

  const runner = PAGES_ONLY_RUNNERS[provider];
  if (!runner) {
    throw Object.assign(new Error(`Proveedor desconocido: ${provider}`), { statusCode: 400 });
  }

  _runningProviders.add(provider);
  resetAbortSignal(provider);

  try {
    await trackRun(provider, runner, triggeredBy);
  } finally {
    _runningProviders.delete(provider);
  }
}
