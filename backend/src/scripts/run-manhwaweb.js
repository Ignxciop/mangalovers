import { runManhwaweb } from "../manga/scrapers/manhwaweb/manhwaweb.js";
import logger from "../config/logger.js";

runManhwaweb().catch((e) => {
    logger.error({ err: e }, "Error ejecutando ManhwaWeb");
    process.exit(1);
});
