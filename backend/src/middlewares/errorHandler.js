import { config } from "../config/env.js";

export const errorHandler = (err, req, res, next) => {
    console.error({
        message: err.message,
        path: req.path,
        method: req.method,
        ...(config.ENVIRONMENT === "development" && { stack: err.stack }),
    });

    const statusCode = err.statusCode || 500;
    const message = err.message || "Error interno del servidor";

    const response = {
        success: false,
        message: statusCode === 500 && config.ENVIRONMENT === "production"
            ? "Error interno del servidor"
            : message,
    };

    res.status(statusCode).json(response);
};
