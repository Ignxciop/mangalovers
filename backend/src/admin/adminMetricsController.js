import { AdminMetricsService } from "./adminMetricsService.js";

export async function getMetrics(req, res, next) {
  try {
    const metrics = await AdminMetricsService.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
}
