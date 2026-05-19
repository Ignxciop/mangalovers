import cron from "node-cron";
import { runAllScrapers } from "../manga/scrapers/scraper.js";
import logger from "../config/logger.js";

let isRunning = false;

export function initScraperCron() {
    cron.schedule("0 * * * *", async () => {
        if (isRunning) {
            logger.warn("Scraper anterior aún en ejecución, saltando esta iteración");
            return;
        }

        isRunning = true;
        logger.info("Cron ejecutando scraping automático...");

        try {
            await runAllScrapers();
        } catch (error) {
            logger.error({ err: error }, "Error en scraper cron");
        } finally {
            isRunning = false;
        }
    });

    logger.info("Scraper cron inicializado (cada 1 hora)");
}
