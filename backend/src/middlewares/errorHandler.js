import { config } from "../config/env.js";
import logger from "../config/logger.js";
import { ActivityLogService } from "../activityLog/activityLogService.js";

export const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const log = req.log || logger;

  log.error({ err, statusCode }, err.message || "Error interno del servidor");

  if (req.user?.userId && statusCode === 500) {
    ActivityLogService.logEvent(
      req.user.userId, "API_ERROR",
      { method: req.method, route: req.originalUrl, statusCode, message: err.message },
      req.ip, req.headers["user-agent"],
    ).catch((logErr) => logger.warn({ err: logErr }, "ActivityLog errorHandler error"));
  }

  const isProduction = config.ENVIRONMENT === "production";
  const message = statusCode === 500 && isProduction
    ? "Error interno del servidor"
    : err.message || "Error interno del servidor";

  const body = { success: false, message };

  if (err.errors && err.name === "ValidationError") {
    body.errors = err.errors;
  }

  res.status(statusCode).json(body);
};
