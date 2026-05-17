import { Router } from "express";
import {
    handleGetReadChapters,
    handleToggleChapterRead,
    handleMarkChaptersUntil,
    handleGetReadingStats,
    handleGetFullStats,
} from "./readController.js";
import { authenticate } from "../middlewares/auth.js";
import {
    seriesIdParamValidator,
    chapterIdParamValidator,
    validate,
} from "./readValidator.js";

const router = Router();

router.get("/series/:seriesId", authenticate, seriesIdParamValidator, validate, handleGetReadChapters);
router.post(
    "/chapter/:chapterId/toggle",
    authenticate,
    chapterIdParamValidator,
    validate,
    handleToggleChapterRead,
);
router.post(
    "/chapter/:chapterId/mark-until",
    authenticate,
    chapterIdParamValidator,
    validate,
    handleMarkChaptersUntil,
);
router.get("/stats", authenticate, handleGetReadingStats);
router.get("/full-stats", authenticate, handleGetFullStats);

export default router;
