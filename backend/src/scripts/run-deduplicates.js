import { deduplicateSeries } from "../manga/scrapers/duplicateSeries.js";

deduplicateSeries().catch((e) => {
    console.error("Error ejecutando deduplicación:", e);
    process.exit(1);
});
