import { param, body } from "express-validator";

export const seriesIdParamValidator = [
  param("seriesId").isInt({ min: 1 }).toInt(),
];

export const chapterIdParamValidator = [
  param("chapterId").isInt({ min: 1 }).toInt(),
];

export const progressBodyValidator = [
  body("pageNumber").optional({ nullable: true }).isInt({ min: 0 }),
  body("percentage").optional({ nullable: true }).isInt({ min: 0, max: 100 }),
];
