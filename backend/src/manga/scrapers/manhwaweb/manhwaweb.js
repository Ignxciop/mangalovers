import { scrapeSeries } from "./series_scraper.js";
import { scrapeChapters } from "./chapters_scraper.js";
import { scrapePages } from "./pages_scraper.js";
import { getAbortSignal } from "../scraperAbort.js";
import logger from "../../../config/logger.js";

export async function runManhwaweb() {
    logger.info("Iniciando provider: manhwaweb");

    await scrapeSeries();
    if (getAbortSignal("manhwaweb").aborted) { logger.info("Manhwaweb detenido después de series"); return; }
    await scrapeChapters();
    if (getAbortSignal("manhwaweb").aborted) { logger.info("Manhwaweb detenido después de capítulos"); return; }
    await scrapePages();

    logger.info("Provider manhwaweb terminado");
}
