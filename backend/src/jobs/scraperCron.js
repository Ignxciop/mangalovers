import cron from "node-cron";
import { prisma } from "../config/prisma.js";
import { runAllScrapers } from "../manga/scrapers/scraper.js";
import logger from "../config/logger.js";

let isRunning = false;
let cronTask = null;

function buildSchedule(minutes) {
  return `*/${minutes} * * * *`;
}

function isValidInterval(minutes) {
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= 1440;
}

function scheduleFromInterval(minutes) {
  if (minutes === 60) return "0 * * * *";
  if (60 % minutes === 0) {
    const perHour = 60 / minutes;
    const mins = Array.from({ length: perHour }, (_, i) => i * minutes).join(",");
    return `${mins} * * * *`;
  }
  return buildSchedule(minutes);
}

export async function initScraperCron() {
  const config = await prisma.scraperConfig.findFirst();
  const interval = config?.intervalMinutes ?? 60;
  const autoEnabled = config?.autoEnabled ?? true;

  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }

  if (!autoEnabled) {
    logger.info("Scraper cron desactivado (autoEnabled=false)");
    return;
  }

  const schedule = scheduleFromInterval(interval);

  if (!cron.validate(schedule)) {
    logger.error({ schedule, interval }, "Expressión cron inválida para scraper");
    return;
  }

  cronTask = cron.schedule(schedule, async () => {
    if (isRunning) {
      logger.warn("Scraper anterior aún en ejecución, saltando esta iteración");
      return;
    }

    isRunning = true;
    logger.info({ schedule }, "Cron ejecutando scraping automático...");

    try {
      await runAllScrapers();
    } catch (error) {
      logger.error({ err: error }, "Error en scraper cron");
    } finally {
      isRunning = false;
    }
  });

  logger.info({ schedule, interval }, "Scraper cron inicializado");
}

export async function restartScraperCron() {
  logger.info("Reiniciando scraper cron con nueva configuración...");
  await initScraperCron();
}
