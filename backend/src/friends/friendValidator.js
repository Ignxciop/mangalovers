import { body, param, query } from "express-validator";

export const searchUsersValidator = [
  query("q").trim().isLength({ min: 2 }).withMessage("La búsqueda debe tener al menos 2 caracteres"),
];

export const sendRequestValidator = [
  body("receiverId").isUUID().withMessage("ID de usuario inválido"),
];

export const requestIdParamValidator = [
  param("id").isInt({ min: 1 }).toInt().withMessage("ID de solicitud inválido"),
];

export const blockUserValidator = [
  body("userId").isUUID().withMessage("ID de usuario inválido"),
];

export const unblockUserValidator = [
  body("userId").isUUID().withMessage("ID de usuario inválido"),
];

export const userIdParamValidator = [
  param("userId").isUUID().withMessage("ID de usuario inválido"),
];
