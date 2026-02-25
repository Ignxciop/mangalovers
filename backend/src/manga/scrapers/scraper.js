import { runOlympus } from "./olympus/olympus.js";
import { runManhwaweb } from "./manhwaweb/manhwaweb.js";

let isRunning = false;

export async function runAllScrapers() {
    if (isRunning) {
        console.log("Scraper ya en ejecución, se omite esta corrida");
        return;
    }

    try {
        isRunning = true;

        console.log("Iniciando scraping global...");

        await runOlympus();
        await runManhwaweb();

        console.log("Scraping global terminado");
    } catch (error) {
        console.error("Error en scraping global:", error);
    } finally {
        isRunning = false;
    }
}
