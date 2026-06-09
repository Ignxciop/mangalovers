import { param, query } from "express-validator";

export const listMangaValidator = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("search").optional().trim().escape(),
  query("provider").optional().trim(),
  query("status").optional().trim(),
  query("sort").optional().isIn(["updated", "chapters", "az", "za"]),
  query("order").optional().isIn(["asc", "desc"]),
  query("genres").optional().trim(),
  query("type").optional().trim(),
  query("read").optional().isIn(["true", "false"]),
];

export const seriesSlugValidator = [
  param("slug").notEmpty().trim(),
];

export const chapterPagesValidator = [
  param("slug").notEmpty().trim(),
  param("chapterId").isInt({ min: 1 }).toInt(),
];

export const latestMangaValidator = [
  query("limit").optional().isInt({ min: 1, max: 50 }).toInt(),
];
