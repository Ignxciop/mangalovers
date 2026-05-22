import { param } from "express-validator";

export const seriesIdParamValidator = [
  param("seriesId").isInt({ min: 1 }).toInt(),
];

export const chapterIdParamValidator = [
  param("chapterId").isInt({ min: 1 }).toInt(),
];
