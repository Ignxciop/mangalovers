import { body, param, query } from "express-validator";

export const listSeriesValidator = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 50 }).toInt(),
  query("search").optional().isString().trim(),
  query("provider").optional().isString().trim(),
];

export const seriesIdParamValidator = [
  param("id").isInt({ min: 1 }).toInt(),
];

export const mergeSeriesValidator = [
  body("keepId").isInt({ min: 1 }).toInt(),
  body("dropId").isInt({ min: 1 }).toInt(),
];

export const createRelationValidator = [
  body("primarySeriesId").isInt({ min: 1 }).toInt(),
  body("fallbackSeriesId").isInt({ min: 1 }).toInt(),
];

export const relationIdParamValidator = [
  param("id").isInt({ min: 1 }).toInt(),
];

export const aliasBodyValidator = [
  param("id").isInt({ min: 1 }).toInt(),
  body("alias").isString().trim().notEmpty(),
];

export const deleteAliasValidator = [
  param("id").isInt({ min: 1 }).toInt(),
  param("aliasId").isInt({ min: 1 }).toInt(),
];
