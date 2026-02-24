import { Router } from "express";
import {
    handleGetReadChapters,
    handleToggleChapterRead,
    handleMarkChaptersUntil,
} from "./readController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/series/:seriesId", authenticate, handleGetReadChapters);
router.post(
    "/chapter/:chapterId/toggle",
    authenticate,
    handleToggleChapterRead,
);
router.post(
    "/chapter/:chapterId/mark-until",
    authenticate,
    handleMarkChaptersUntil,
);

export default router;
