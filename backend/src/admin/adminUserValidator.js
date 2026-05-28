import { body, param, query } from "express-validator";

export const listUsersValidator = [
  query("search")
    .optional()
    .trim()
    .isString().withMessage("Búsqueda inválida"),
  query("role")
    .optional()
    .isIn(["ADMIN", "USER"])
    .withMessage("Rol inválido"),
  query("status")
    .optional()
    .isIn(["ACTIVE", "BANNED", "SUSPENDED"])
    .withMessage("Estado inválido"),
  query("page")
    .optional()
    .toInt()
    .isInt({ min: 1 }).withMessage("Page debe ser un número positivo"),
  query("limit")
    .optional()
    .toInt()
    .isInt({ min: 1, max: 50 }).withMessage("Limit debe estar entre 1 y 50"),
];

export const updateRoleValidator = [
  param("id")
    .notEmpty()
    .isString().withMessage("ID de usuario inválido"),
  body("role")
    .isIn(["ADMIN", "USER"])
    .withMessage("Rol inválido"),
];

export const updateStatusValidator = [
  param("id")
    .notEmpty()
    .isString().withMessage("ID de usuario inválido"),
  body("status")
    .isIn(["ACTIVE", "BANNED", "SUSPENDED"])
    .withMessage("Estado inválido"),
  body("suspendedUntil")
    .optional({ values: "null" })
    .isISO8601().withMessage("Fecha de suspensión inválida"),
];
