import { body } from "express-validator";

export const registerValidator = [
  body("email")
    .isEmail()
    .withMessage("Debe proporcionar un email válido")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("La contraseña debe tener al menos 6 caracteres"),
  body("name")
    .trim()
    .notEmpty()
    .withMessage("El nombre es requerido")
    .isLength({ min: 2, max: 100 })
    .withMessage("El nombre debe tener entre 2 y 100 caracteres"),
  body("lastname")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("El apellido debe tener entre 2 y 100 caracteres"),
  body("alias")
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("El alias debe tener entre 3 y 30 caracteres")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("El alias solo puede contener letras, números y guion bajo"),
];

export const loginValidator = [
  body("email")
    .isEmail()
    .withMessage("Debe proporcionar un email válido")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("La contraseña es requerida"),
];

export const googleLoginValidator = [
  body("idToken")
    .notEmpty()
    .withMessage("Token de Google requerido"),
];

export const refreshValidator = [
  body("refreshToken").optional(),
];

export const updateProfileValidator = [
  body("name").optional().trim().isLength({ min: 2, max: 100 }),
  body("lastname").optional().trim().isLength({ min: 2, max: 100 }),
  body("email").optional().isEmail().normalizeEmail(),
  body("profileVisibility").optional().isIn(["PUBLIC", "FRIENDS", "PRIVATE"]).withMessage("Visibilidad inválida"),
];

export const updatePasswordValidator = [
  body("currentPassword").notEmpty().withMessage("La contraseña actual es requerida"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("La nueva contraseña debe tener al menos 6 caracteres"),
];

export const deleteAccountValidator = [
  body("password").notEmpty().withMessage("La contraseña es requerida"),
];

export const updateAliasValidator = [
  body("alias")
    .trim()
    .notEmpty()
    .withMessage("El alias es requerido")
    .isLength({ min: 3, max: 30 })
    .withMessage("El alias debe tener entre 3 y 30 caracteres")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("El alias solo puede contener letras, números y guion bajo"),
];
