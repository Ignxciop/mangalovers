import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { config } from "../config/env.js";
import { UnauthorizedError, ForbiddenError } from "../utils/errors.js";

function formatSuspendedUntil(date) {
  return new Date(date).toLocaleString("es-ES", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

async function checkUserStatus(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, suspendedUntil: true },
  });

  if (!user) throw new ForbiddenError("Usuario no encontrado");

  if (user.status === "BANNED") {
    throw new ForbiddenError("Tu cuenta ha sido baneada");
  }

  if (user.status === "SUSPENDED") {
    if (!user.suspendedUntil || new Date(user.suspendedUntil) <= new Date()) {
      await prisma.user.update({
        where: { id: userId },
        data: { status: "ACTIVE", suspendedUntil: null },
      });
    } else {
      throw new ForbiddenError(
        `Tu cuenta está suspendida hasta el ${formatSuspendedUntil(user.suspendedUntil)}`,
      );
    }
  }
}

const lastLoginCache = new Map();

function formatRemainingTime(suspendedUntil) {
  const ms = new Date(suspendedUntil).getTime() - Date.now();
  if (ms <= 0) return null;
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days} día${days > 1 ? "s" : ""}`;
  }
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes} min`;
}

async function checkUserStatus(user) {
  if (!user) return;
  if (user.status === "BANNED") {
    throw new ForbiddenError("Tu cuenta ha sido baneada");
  }
  if (user.status === "SUSPENDED") {
    if (user.suspendedUntil && new Date(user.suspendedUntil) <= new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { status: "ACTIVE", suspendedUntil: null },
      });
      return;
    }
    const remaining = user.suspendedUntil ? formatRemainingTime(user.suspendedUntil) : null;
    if (remaining) {
      throw new ForbiddenError(`Tu cuenta está suspendida por ${remaining}`);
    }
    throw new ForbiddenError("Tu cuenta está suspendida");
  }
}

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

<<<<<<< HEAD
    await checkUserStatus(req.user.userId);
=======
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, status: true, suspendedUntil: true },
    });

    await checkUserStatus(user);
>>>>>>> 4ee2309caea05bafe20313603d154d48f7caa02e

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

// Middleware que solo verifica el JWT sin checkear status (para polling de usuarios baneados/suspendidos)
export const authenticateBasic = async (req, res, next) => {
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
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) return next(error);
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
