import { scrapeSeries } from "./series_scraper.js";
import { scrapeChapters } from "./chapters_scraper.js";
import { scrapePages } from "./pages_scraper.js";

export async function runManhwaweb() {
    console.log("Iniciando provider: manhwaweb");

    await scrapeSeries();
    await scrapeChapters();
    await scrapePages();

    console.log("Provider manhwaweb terminado");
}
