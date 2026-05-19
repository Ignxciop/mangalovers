import { config } from "../config/env.js";
import logger from "../config/logger.js";

export const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const log = req.log || logger;

    log.error({ err, statusCode }, err.message || "Error interno del servidor");

    const message = statusCode === 500 && config.ENVIRONMENT === "production"
        ? "Error interno del servidor"
        : (err.message || "Error interno del servidor");

    res.status(statusCode).json({ success: false, message });
};
