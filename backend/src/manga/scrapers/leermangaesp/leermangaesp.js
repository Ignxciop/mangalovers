import { scrapeSeries } from "./series_scraper.js";
import { scrapeChapters } from "./chapters_scraper.js";
import { scrapePages } from "./pages_scraper.js";
import { getAbortSignal } from "../scraperAbort.js";
import logger from "../../../config/logger.js";

export async function runLeermangaesp() {
    logger.info("Iniciando provider: leermangaesp");

    await scrapeSeries();
    if (getAbortSignal("leermangaesp").aborted) { logger.info("Leermangaesp detenido después de series"); return; }
    await scrapeChapters();
    if (getAbortSignal("leermangaesp").aborted) { logger.info("Leermangaesp detenido después de capítulos"); return; }
    await scrapePages();

    logger.info("Provider leermangaesp terminado");
}
