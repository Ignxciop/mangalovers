import { body, query } from "express-validator";

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
