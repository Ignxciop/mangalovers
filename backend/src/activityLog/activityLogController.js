import { ActivityLogService } from "./activityLogService.js";

export async function handleGetUserLogs(req, res, next) {
  try {
    const userId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const filters = {};
    if (req.query.event) filters.event = req.query.event;
    if (req.query.from) filters.from = req.query.from;
    if (req.query.to) filters.to = req.query.to;

    const result = await ActivityLogService.getUserLogs(userId, page, limit, filters);
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    next(error);
  }
}

export async function handleGetAllLogs(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const filters = {};
    if (req.query.userId) filters.userId = req.query.userId;
    if (req.query.event) filters.event = req.query.event;
    if (req.query.from) filters.from = req.query.from;
    if (req.query.to) filters.to = req.query.to;

    const result = await ActivityLogService.getAllLogs(page, limit, filters);
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    next(error);
  }
}
