import { Router } from "express";
import {
    handleGetAllManga,
    handleGetLatestManga,
    getSeriesDetail,
    handleGetChapterPages,
    handleGetAllGenres,
} from "./mangaController.js";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/", optionalAuthenticate, handleGetAllManga);
router.get("/latest", optionalAuthenticate, handleGetLatestManga);
router.get(
    "/capitulo/:chapterId/pages",
    optionalAuthenticate,
    handleGetChapterPages,
);
router.get("/genres", optionalAuthenticate, handleGetAllGenres);
router.get("/:slug", optionalAuthenticate, getSeriesDetail);

export default router;
