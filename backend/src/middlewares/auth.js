import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { UnauthorizedError } from "../utils/errors.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new UnauthorizedError("Token no proporcionado");

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      throw new UnauthorizedError("Formato de token inválido");
    }

    const token = parts[1];
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = { userId: decoded.userId };
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return next(error);
    }
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(new UnauthorizedError("Token inválido o expirado"));
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
