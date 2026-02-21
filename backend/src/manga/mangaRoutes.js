import { Router } from "express";
import { handleGetAllManga, handleGetLatestManga } from "./mangaController.js";

const router = Router();

router.get("/", handleGetAllManga);
router.get("/latest", handleGetLatestManga);

export default router;
