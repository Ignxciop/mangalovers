import { body, param, query } from "express-validator";

export const createSuggestionValidator = [
  body("type")
    .isIn(["BUG", "SUGGESTION", "CONTENT_ERROR", "TECHNICAL_PROBLEM", "OTHER"])
    .withMessage("Tipo de sugerencia inválido"),
  body("title")
    .trim()
    .notEmpty().withMessage("El título es requerido")
    .isLength({ max: 200 }).withMessage("El título no puede exceder 200 caracteres"),
  body("description")
    .trim()
    .notEmpty().withMessage("La descripción es requerida")
    .isLength({ max: 5000 }).withMessage("La descripción no puede exceder 5000 caracteres"),
  body("image")
    .optional({ values: "falsy" })
    .isString().withMessage("La imagen debe ser una URL válida"),
];

export const updateStatusValidator = [
  param("id")
    .toInt()
    .isInt().withMessage("ID inválido"),
  body("status")
    .isIn(["OPEN", "REVIEWING", "RESOLVED", "REJECTED", "CLOSED"])
    .withMessage("Estado inválido"),
  body("adminResponse")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 2000 }).withMessage("La respuesta no puede exceder 2000 caracteres"),
];

export const listSuggestionsValidator = [
  query("type")
    .optional()
    .isIn(["BUG", "SUGGESTION", "CONTENT_ERROR", "TECHNICAL_PROBLEM", "OTHER"])
    .withMessage("Tipo inválido"),
  query("status")
    .optional()
    .isIn(["OPEN", "REVIEWING", "RESOLVED", "REJECTED", "CLOSED"])
    .withMessage("Estado inválido"),
  query("search")
    .optional()
    .trim()
    .isString().withMessage("Búsqueda inválida"),
  query("page")
    .optional()
    .toInt()
    .isInt({ min: 1 }).withMessage("Page debe ser un número positivo"),
  query("limit")
    .optional()
    .toInt()
    .isInt({ min: 1, max: 50 }).withMessage("Limit debe estar entre 1 y 50"),
];
