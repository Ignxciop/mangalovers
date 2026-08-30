import { param, body } from "express-validator";

export const deleteChatMessageValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID de mensaje inválido"),
];

export const muteChatUserValidator = [
  body("userId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("userId es requerido"),
  body("durationMinutes")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("durationMinutes debe ser un número de minutos positivo"),
  body("reason")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 300 })
    .withMessage("El motivo no puede exceder 300 caracteres"),
];

export const unmuteChatUserValidator = [
  param("userId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("ID de usuario inválido"),
];