import { runOlympus } from "../manga/scrapers/olympus/olympus.js";
import logger from "../config/logger.js";

runOlympus().catch((e) => {
    logger.error({ err: e }, "Error ejecutando Olympus");
    process.exit(1);
});
