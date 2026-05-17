import { body, param, validationResult } from "express-validator";

export const seriesIdParamValidator = [
    param("seriesId").isInt({ min: 1 }).toInt(),
];

export const upsertFavoriteValidator = [
    body("seriesId").isInt({ min: 1 }).toInt(),
    body("status")
        .optional()
        .isIn(["Siguiendo", "Terminado"]),
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
