export const errorHandler = (err, req, res, next) => {
    console.error({ err, path: req.path, method: req.method }, "Request error");

    const statusCode = err.statusCode || 500;
    const message = err.message || "Error interno del servidor";

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
};
