import { runOlympus } from "../manga/scrapers/olympus/olympus.js";

runOlympus().catch((e) => {
    console.error("Error ejecutando Olympus:", e);
    process.exit(1);
});
