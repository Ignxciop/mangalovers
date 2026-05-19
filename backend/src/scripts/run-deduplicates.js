import { deduplicateSeries } from "../manga/scrapers/duplicateSeries.js";
import logger from "../config/logger.js";

deduplicateSeries().catch((e) => {
    logger.error({ err: e }, "Error ejecutando deduplicación");
    process.exit(1);
});
