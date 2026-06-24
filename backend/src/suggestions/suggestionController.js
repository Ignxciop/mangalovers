import { SuggestionService } from "./suggestionService.js";
import { ActivityLogService } from "../activityLog/activityLogService.js";
import logger from "../config/logger.js";

export async function create(req, res, next) {
  try {
    const { type, title, description, image } = req.body;
    const suggestion = await SuggestionService.create(req.user.userId, {
      type, title, description, image,
    });
    res.status(201).json({ success: true, message: "Sugerencia enviada", data: suggestion });

    ActivityLogService.logEvent(
      req.user.userId, "SEND_SUGGESTION",
      { suggestionId: suggestion.id, type, title },
      req.ip, req.headers["user-agent"],
    ).catch((err) => logger.warn({ err, userId: req.user.userId, event: "SEND_SUGGESTION" }, "ActivityLog error"));
  } catch (error) {
    next(error);
  }
}

export async function getMySuggestions(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const result = await SuggestionService.getUserSuggestions(req.user.userId, page, limit);
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    next(error);
  }
}

export async function getAll(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const filters = {};
    if (req.query.type) filters.type = req.query.type;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.search) filters.search = req.query.search;

    const result = await SuggestionService.getAll(page, limit, filters);
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const suggestionId = parseInt(req.params.id);
    const { status, adminResponse } = req.body;
    const existing = await SuggestionService.getById(suggestionId);
    const suggestion = await SuggestionService.updateStatus(suggestionId, status, req.user.userId, adminResponse);
    res.json({ success: true, message: "Estado actualizado", data: suggestion });

    ActivityLogService.logEvent(
      req.user.userId, "UPDATE_SUGGESTION_STATUS",
      { suggestionId, title: existing?.title, newStatus: status, oldStatus: existing?.status },
      req.ip, req.headers["user-agent"],
    ).catch((err) => logger.warn({ err, userId: req.user.userId, event: "UPDATE_SUGGESTION_STATUS" }, "ActivityLog error"));
  } catch (error) {
    next(error);
  }
}
