import { Router } from "express";
import {
  handleGetAllManga, handleGetLatestManga, getSeriesDetail,
  handleGetChapterPages, handleGetAllGenres, handleGetRecommended,
} from "./mangaController.js";
import { optionalAuthenticate } from "../middlewares/auth.js";
import {
  listMangaValidator, seriesSlugValidator,
  chapterPagesValidator, latestMangaValidator,
} from "./mangaValidator.js";
import { validate } from "../utils/validate.js";

const router = Router();

router.get("/", optionalAuthenticate, listMangaValidator, validate, handleGetAllManga);
router.get("/latest", optionalAuthenticate, latestMangaValidator, validate, handleGetLatestManga);
router.get("/capitulo/:slug/:chapterId/pages", optionalAuthenticate, chapterPagesValidator, validate, handleGetChapterPages);
router.get("/genres", optionalAuthenticate, handleGetAllGenres);
router.get("/recommended", optionalAuthenticate, handleGetRecommended);
router.get("/:slug", optionalAuthenticate, seriesSlugValidator, validate, getSeriesDetail);

export default router;
