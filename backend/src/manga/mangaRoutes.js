import { Router } from "express";
import {
    handleGetAllManga,
    handleGetLatestManga,
    getSeriesDetail,
    handleGetChapterPages,
} from "./mangaController.js";

const router = Router();

router.get("/", handleGetAllManga);
router.get("/latest", handleGetLatestManga);
router.get("/capitulo/:chapterId/pages", handleGetChapterPages);
router.get("/:slug", getSeriesDetail);

export default router;
