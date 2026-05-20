import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Token no proporcionado",
            });
        }

        const parts = authHeader.split(" ");
        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return res.status(401).json({
                success: false,
                message: "Formato de token inválido",
            });
        }

        const token = parts[1];
        const decoded = jwt.verify(token, config.JWT_SECRET);
        req.user = { userId: decoded.userId };
        next();
    } catch (error) {
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Token inválido",
            });
        }
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token expirado",
            });
        }
        next(error);
    }
};

export const optionalAuthenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            req.user = null;
            return next();
        }

        const parts = authHeader.split(" ");
        if (parts.length !== 2 || parts[0] !== "Bearer") {
            req.user = null;
            return next();
        }

        const token = parts[1];
        const decoded = jwt.verify(token, config.JWT_SECRET);
        req.user = { userId: decoded.userId };
        next();
    } catch {
        req.user = null;
        next();
    }
};
