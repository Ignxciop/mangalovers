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

export async function handleTriggerProviderRun(req, res, next) {
  try {
    const { provider } = req.params;
    const result = await ScraperAdminService.triggerProviderRun(provider, req.user.userId);
    res.json({ success: true, message: `Scraper de ${provider} iniciado manualmente` });
  } catch (error) {
    next(error);
  }
}

export async function handleStopScraper(req, res, next) {
  try {
    const { provider } = req.params;
    const result = await ScraperAdminService.stopRunningScraper(provider);
    res.json(result);
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

export async function handleScrapeSingleSeries(req, res, next) {
  try {
    const { seriesId } = req.params;
    const result = await ScraperAdminService.scrapeSingleSeries(Number(seriesId));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function handleFullScrapeSeries(req, res, next) {
  try {
    const { seriesId } = req.params;
    const { provider } = req.query;
    if (!provider) {
      throw Object.assign(new Error("El query param 'provider' es requerido"), { statusCode: 400 });
    }
    const result = await ScraperAdminService.fullScrapeSeries(Number(seriesId), provider);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function handleGetMissingPages(req, res, next) {
  try {
    const data = await ScraperAdminService.getMissingPages();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function handleRefillMissingPages(req, res, next) {
  try {
    const { provider } = req.params;
    const maxPages = req.query.maxPages ? parseInt(req.query.maxPages, 10) : null;
    const result = await ScraperAdminService.refillMissingPages(provider, maxPages);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function handleRefillSingleChapter(req, res, next) {
  try {
    const { chapterId } = req.body;
    const result = await ScraperAdminService.refillSingleChapter(chapterId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
