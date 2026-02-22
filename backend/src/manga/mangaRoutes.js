import { Router } from "express";
import {
    handleGetAllManga,
    handleGetLatestManga,
    getSeriesDetail,
    handleGetChapterPages,
} from "./mangaController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/", handleGetAllManga);
router.get("/latest", handleGetLatestManga);
router.get("/:slug", getSeriesDetail);
router.get("/:chapterId/pages", handleGetChapterPages);

export default router;
