import { body, param } from "express-validator";

export const seriesIdParamValidator = [
  param("seriesId").isInt({ min: 1 }).toInt(),
];

export const upsertFavoriteValidator = [
  body("seriesId").isInt({ min: 1 }).toInt(),
  body("status").optional().isIn(["Siguiendo", "Terminado"]),
];
