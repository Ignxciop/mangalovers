import { scrapeSeries } from "./series_scraper.js";
import { scrapeChapters } from "./chapters_scraper.js";
import { scrapePages } from "./pages_scraper.js";

async function main() {
    await scrapeSeries();
    await scrapeChapters();
    await scrapePages();
    process.exit(0);
}

main();
