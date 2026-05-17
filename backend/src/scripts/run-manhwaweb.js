import { runManhwaweb } from "../manga/scrapers/manhwaweb/manhwaweb.js";

runManhwaweb().catch((e) => {
    console.error("Error ejecutando ManhwaWeb:", e);
    process.exit(1);
});
