import { Router } from "express";
import {
    handleGetFavorites,
    handleGetFavorite,
    handleUpsertFavorite,
    handleDeleteFavorite,
} from "./favoriteController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/", authenticate, handleGetFavorites);
router.get("/:seriesId", authenticate, handleGetFavorite);
router.post("/", authenticate, handleUpsertFavorite);
router.delete("/:seriesId", authenticate, handleDeleteFavorite);

export default router;
