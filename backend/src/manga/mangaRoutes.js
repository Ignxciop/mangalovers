import { Router } from "express";
import {
    handleGetAllManga,
    handleGetLatestManga,
    getSeriesDetail,
} from "./mangaController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/", handleGetAllManga);
router.get("/latest", handleGetLatestManga);
router.get("/:slug", getSeriesDetail);

export default router;
