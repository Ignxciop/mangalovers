import cron from "node-cron";
import { runAllScrapers } from "../manga/scrapers/scraper.js";

let isRunning = false;

export function initScraperCron() {
    cron.schedule("0 * * * *", async () => {
        if (isRunning) {
            console.log("Scraper anterior aún en ejecución, saltando esta iteración");
            return;
        }

        isRunning = true;
        console.log("Cron ejecutando scraping automático...");

        try {
            await runAllScrapers();
        } catch (error) {
            console.error("Error en scraper cron:", error.message);
        } finally {
            isRunning = false;
        }
    });

    console.log("Scraper cron inicializado (cada 1 hora)");
}
