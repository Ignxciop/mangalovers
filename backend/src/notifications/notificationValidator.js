import { body, query, param } from "express-validator";

export const subscribeValidator = [
  body("endpoint")
    .notEmpty()
    .withMessage("Falta el campo endpoint")
    .isString(),
  body("keys.p256dh")
    .notEmpty()
    .withMessage("Falta el campo keys.p256dh")
    .isString(),
  body("keys.auth")
    .notEmpty()
    .withMessage("Falta el campo keys.auth")
    .isString(),
];

export const unsubscribeValidator = [
  body("endpoint")
    .notEmpty()
    .withMessage("Falta el campo endpoint")
    .isString(),
];

export const subscriptionStatusValidator = [
  query("endpoint")
    .notEmpty()
    .withMessage("Falta el parámetro endpoint")
    .isString(),
];

export const paginationValidator = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 50 }).toInt(),
];

export const idParamValidator = [
  param("id").isString().notEmpty().withMessage("ID de notificación inválido"),
];
