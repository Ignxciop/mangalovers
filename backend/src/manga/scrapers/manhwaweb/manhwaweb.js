import { scrapeSeries } from "./series_scraper.js";
import { scrapeChapters } from "./chapters_scraper.js";
import { scrapePages } from "./pages_scraper.js";
import logger from "../../../config/logger.js";

export async function runManhwaweb() {
    logger.info("Iniciando provider: manhwaweb");

    await scrapeSeries();
    await scrapeChapters();
    await scrapePages();

    logger.info("Provider manhwaweb terminado");
}
