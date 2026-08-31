import { query } from "express-validator";

export const getMessagesValidator = [
  query("cursor")
    .optional()
    .isInt({ min: 1 })
    .withMessage("cursor debe ser un entero positivo"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("limit debe estar entre 1 y 50"),
];