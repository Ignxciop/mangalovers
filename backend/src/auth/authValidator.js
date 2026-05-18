import { body, validationResult } from "express-validator";

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
];

export const loginValidator = [
    body("email")
        .isEmail()
        .withMessage("Debe proporcionar un email válido")
        .normalizeEmail(),
    body("password").notEmpty().withMessage("La contraseña es requerida"),
];

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: "Errores de validación",
            errors: errors.array(),
        });
    }
    next();
};
