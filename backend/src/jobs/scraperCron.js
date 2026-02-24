import cron from "node-cron";
import { runAllScrapers } from "../manga/scrapers/scraper.js";

export function initScraperCron() {
    /* Descomentar para iniciar scraping apenas inicie servidor
    (async () => {
        console.log("Ejecutando scraping inicial...");
        await runAllScrapers();
    })();
    */
    cron.schedule("0 * * * *", async () => {
        console.log("Cron ejecutando scraping automático...");
        await runAllScrapers();
    });

    console.log("Scraper cron inicializado (cada 1 hora)");
}
