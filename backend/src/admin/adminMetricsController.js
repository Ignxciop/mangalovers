import { AdminMetricsService } from "./adminMetricsService.js";

export async function getMetrics(req, res, next) {
  try {
    const metrics = await AdminMetricsService.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
}

export async function getOverview(req, res, next) {
  try {
    const overview = await AdminMetricsService.getOverview();
    res.json({ success: true, data: overview });
  } catch (error) {
    next(error);
  }
}

export async function getScraperMetrics(req, res, next) {
  try {
    const metrics = await AdminMetricsService.getScraperMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
}

export async function getUserMetrics(req, res, next) {
  try {
    const metrics = await AdminMetricsService.getUserMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
}

export async function getContentMetrics(req, res, next) {
  try {
    const metrics = await AdminMetricsService.getContentMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
}

export async function getSystemMetrics(req, res, next) {
  try {
    const metrics = await AdminMetricsService.getSystemMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
}
