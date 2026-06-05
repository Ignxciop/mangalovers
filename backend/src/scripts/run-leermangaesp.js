import { runLeermangaesp } from "../manga/scrapers/leermangaesp/leermangaesp.js";
import logger from "../config/logger.js";

runLeermangaesp().catch((e) => {
    logger.error({ err: e }, "Error ejecutando LeerMangaEsp");
    process.exit(1);
});
