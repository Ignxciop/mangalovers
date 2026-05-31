import { Router } from "express";
import {
  handleGetReadChapters, handleToggleChapterRead,
  handleMarkChaptersUntil, handleGetReadingStats, handleGetFullStats,
  handleUpsertProgress, handleGetChapterProgress, handleGetSeriesProgress,
} from "./readController.js";
import { authenticate } from "../middlewares/auth.js";
import {
  seriesIdParamValidator, chapterIdParamValidator,
  progressBodyValidator,
} from "./readValidator.js";
import { validate } from "../utils/validate.js";

const router = Router();

router.get("/series/:seriesId", authenticate, seriesIdParamValidator, validate, handleGetReadChapters);
router.post("/chapter/:chapterId/toggle", authenticate, chapterIdParamValidator, validate, handleToggleChapterRead);
router.post("/chapter/:chapterId/mark-until", authenticate, chapterIdParamValidator, validate, handleMarkChaptersUntil);
router.get("/stats", authenticate, handleGetReadingStats);
router.get("/full-stats", authenticate, handleGetFullStats);

router.put("/chapter/:chapterId/progress", authenticate, chapterIdParamValidator, progressBodyValidator, validate, handleUpsertProgress);
router.get("/chapter/:chapterId/progress", authenticate, chapterIdParamValidator, validate, handleGetChapterProgress);
router.get("/series/:seriesId/progress", authenticate, seriesIdParamValidator, validate, handleGetSeriesProgress);

export default router;
