import { runOlympus } from "./olympus/olympus.js";
import { runManhwaweb } from "./manhwaweb/manhwaweb.js";
import { deduplicateSeries } from "./duplicateSeries.js";
import logger from "../../config/logger.js";

let isRunning = false;

export async function runAllScrapers() {
    if (isRunning) {
        logger.warn("Scraper ya en ejecución, se omite esta corrida");
        return;
    }

    try {
        isRunning = true;

        logger.info("Iniciando scraping global...");

        await runOlympus();
        await runManhwaweb();
        await deduplicateSeries();

        logger.info("Scraping global terminado");
    } catch (error) {
        logger.error({ err: error }, "Error en scraping global");
    } finally {
        isRunning = false;
    }
}
