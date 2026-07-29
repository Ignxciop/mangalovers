import { param, body } from "express-validator";

export const reportCommentValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID de comentario inválido"),
  body("reason")
    .isIn(["OFFENSIVE_LANGUAGE", "UNMARKED_SPOILER", "OTHER"])
    .withMessage("Motivo de reporte inválido"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("La descripción no puede exceder 500 caracteres"),
];

export const resolveReportValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID de reporte inválido"),
  body("status")
    .isIn(["REVIEWED", "DISMISSED", "RESOLVED"])
    .withMessage("Estado inválido"),
  body("adminNote")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("La nota no puede exceder 500 caracteres"),
];
