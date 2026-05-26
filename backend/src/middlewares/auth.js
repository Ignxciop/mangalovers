import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { config } from "../config/env.js";
import { UnauthorizedError, ForbiddenError } from "../utils/errors.js";

const lastLoginCache = new Map();

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
    req.user = { userId: decoded.userId, role: decoded.role };

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { status: true },
    });

    if (user && user.status === "BANNED") {
      throw new ForbiddenError("Tu cuenta ha sido suspendida");
    }

    next();

    const now = Date.now();
    const last = lastLoginCache.get(req.user.userId);
    if (!last || now - last > 3600000) {
      lastLoginCache.set(req.user.userId, now);
      prisma.user.update({
        where: { id: req.user.userId },
        data: { lastLoginAt: new Date() },
      }).catch(() => {});
    }
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
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
    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch {
    req.user = null;
    next();
  }
};
