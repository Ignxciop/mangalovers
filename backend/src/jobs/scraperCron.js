import { prisma } from "../config/prisma.js";
import { runAllScrapers } from "../manga/scrapers/scraper.js";
import logger from "../config/logger.js";
import { APP_TIMEZONE, startOfDay } from "../utils/time.js";

let isRunning = false;
let timeoutHandle = null;

function isValidInterval(minutes) {
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= 1440;
}

// Los disparos se alinean contra la medianoche chilena del día actual (dayStart).
// Los intervalos que dividen 1440 exactamente (60, 120, 240...) forman una grilla
// continua día tras día; los que no dividen 1440 reinician la grilla en cada
// medianoche chilena — comportamiento aceptable y predecible.
export function msUntilNextAligned(intervalMs, referenceDate = new Date()) {
  const dayStart = startOfDay(referenceDate, APP_TIMEZONE).getTime();
  const elapsedInDay = referenceDate.getTime() - dayStart;
  const nextAligned = dayStart + Math.ceil(elapsedInDay / intervalMs) * intervalMs;
  return nextAligned - referenceDate.getTime();
}

export async function tick(enabledProviders) {
  if (isRunning) {
    logger.warn("Scraper anterior aún en ejecución, saltando esta iteración");
    return;
  }

  isRunning = true;
  logger.info({ providers: enabledProviders }, "Ejecutando scraping automático...");

  try {
    await runAllScrapers("cron", enabledProviders);
  } catch (error) {
    logger.error({ err: error }, "Error en scraper cron");
  } finally {
    isRunning = false;
  }
}

export function scheduleNextTick(intervalMs, enabledProviders) {
  let delay = msUntilNextAligned(intervalMs);
  if (delay === 0) delay = intervalMs;
  timeoutHandle = setTimeout(async () => {
    await tick(enabledProviders);
    scheduleNextTick(intervalMs, enabledProviders);
  }, delay);
}

export async function initScraperCron() {
  const config = await prisma.scraperConfig.findFirst();
  const interval = config?.intervalMinutes ?? 60;
  const autoEnabled = config?.autoEnabled ?? true;
  const enabledProviders = config?.enabledProviders ?? ["olympus", "manhwaweb", "leermangaesp"];

  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }

  if (!autoEnabled) {
    logger.info("Scraper cron desactivado (autoEnabled=false)");
    return;
  }

  if (!isValidInterval(interval)) {
    logger.error({ interval }, "Intervalo inválido para scraper");
    return;
  }

  const intervalMs = interval * 60 * 1000;
  const delay = msUntilNextAligned(intervalMs);
  const nextRunAt = new Date(Date.now() + delay);

  scheduleNextTick(intervalMs, enabledProviders);

  logger.info(
    {
      intervalMinutes: interval,
      timezone: APP_TIMEZONE,
      nextRun: nextRunAt.toLocaleString("es-CL", { timeZone: APP_TIMEZONE }),
    },
    "Scraper cron inicializado",
  );
}

export async function restartScraperCron() {
  logger.info("Reiniciando scraper cron con nueva configuración...");
  await initScraperCron();
}
