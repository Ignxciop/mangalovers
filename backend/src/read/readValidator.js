import { param, validationResult } from "express-validator";

export const seriesIdParamValidator = [
    param("seriesId").isInt({ min: 1 }).toInt(),
];

export const chapterIdParamValidator = [
    param("chapterId").isInt({ min: 1 }).toInt(),
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
