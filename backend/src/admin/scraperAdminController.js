import { ScraperAdminService } from "./scraperAdminService.js";
import { restartScraperCron } from "../jobs/scraperCron.js";

export async function handleGetConfig(req, res, next) {
  try {
    const config = await ScraperAdminService.getConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateConfig(req, res, next) {
  try {
    const config = await ScraperAdminService.updateConfig(req.body);
    await restartScraperCron();
    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
}

export async function handleTriggerRun(req, res, next) {
  try {
    const result = await ScraperAdminService.triggerManualRun(req.user.userId);
    res.json({ success: true, message: "Scraper iniciado manualmente" });
  } catch (error) {
    next(error);
  }
}

export async function handleGetStatus(req, res, next) {
  try {
    const status = await ScraperAdminService.getStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
}
