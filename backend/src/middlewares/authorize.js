import { prisma } from "../config/prisma.js";
import { UnauthorizedError } from "../utils/errors.js";

export const authorize = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError("No autenticado");
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { role: true },
      });

      if (!user || !allowedRoles.includes(user.role)) {
        throw new UnauthorizedError("No tienes permisos para realizar esta acción");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
