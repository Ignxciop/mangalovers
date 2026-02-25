import { Router } from "express";
import {
    handleGetAllManga,
    handleGetLatestManga,
    getSeriesDetail,
    handleGetChapterPages,
} from "./mangaController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/", authenticate, handleGetAllManga);
router.get("/latest", authenticate, handleGetLatestManga);
router.get("/capitulo/:chapterId/pages", authenticate, handleGetChapterPages);
router.get("/:slug", authenticate, getSeriesDetail);

export default router;
