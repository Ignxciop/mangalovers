import { scrapeSeries } from "./series_scraper.js";
import { scrapeChapters } from "./chapters_scraper.js";
import { scrapePages } from "./pages_scraper.js";
import { getAbortSignal } from "../scraperAbort.js";
import logger from "../../../config/logger.js";

export async function runOlympus() {
    logger.info("Iniciando provider: olympus");

    await scrapeSeries();
    if (getAbortSignal("olympus").aborted) { logger.info("Olympus detenido después de series"); return; }
    await scrapeChapters();
    if (getAbortSignal("olympus").aborted) { logger.info("Olympus detenido después de capítulos"); return; }
    await scrapePages();

    logger.info("Provider olympus terminado");
}
