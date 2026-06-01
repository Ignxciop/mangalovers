import { body, param, query } from "express-validator";

export const listAnnouncementsValidator = [
  query("page")
    .optional()
    .toInt()
    .isInt({ min: 1 }).withMessage("Page debe ser un número positivo"),
  query("limit")
    .optional()
    .toInt()
    .isInt({ min: 1, max: 50 }).withMessage("Limit debe estar entre 1 y 50"),
  query("active")
    .optional()
    .isIn(["true", "false"])
    .withMessage("Active debe ser true o false"),
  query("search")
    .optional()
    .trim()
    .isString().withMessage("Búsqueda inválida"),
];

export const createAnnouncementValidator = [
  body("title")
    .notEmpty().withMessage("El título es obligatorio")
    .trim()
    .isString().withMessage("Título inválido"),
  body("body")
    .notEmpty().withMessage("El cuerpo es obligatorio")
    .trim()
    .isString().withMessage("Cuerpo inválido"),
  body("active")
    .optional()
    .isBoolean().withMessage("Active debe ser booleano"),
  body("publishAt")
    .optional()
    .isISO8601().withMessage("Fecha de publicación inválida"),
  body("expiresAt")
    .optional()
    .isISO8601().withMessage("Fecha de expiración inválida"),
];

export const updateAnnouncementValidator = [
  param("id")
    .toInt()
    .isInt({ min: 1 }).withMessage("ID de anuncio inválido"),
  body("title")
    .optional()
    .trim()
    .isString().withMessage("Título inválido"),
  body("body")
    .optional()
    .trim()
    .isString().withMessage("Cuerpo inválido"),
  body("active")
    .optional()
    .isBoolean().withMessage("Active debe ser booleano"),
  body("publishAt")
    .optional()
    .isISO8601().withMessage("Fecha de publicación inválida"),
  body("expiresAt")
    .optional()
    .isISO8601().withMessage("Fecha de expiración inválida"),
];

export const deleteAnnouncementValidator = [
  param("id")
    .toInt()
    .isInt({ min: 1 }).withMessage("ID de anuncio inválido"),
];
