import { Router } from "express";
import {
  handleGetFavorites, handleGetFavorite,
  handleUpsertFavorite, handleDeleteFavorite,
} from "./favoriteController.js";
import { authenticate } from "../middlewares/auth.js";
import { seriesIdParamValidator, upsertFavoriteValidator } from "./favoriteValidator.js";
import { validate } from "../utils/validate.js";

const router = Router();

router.get("/", authenticate, handleGetFavorites);
router.get("/:seriesId", authenticate, seriesIdParamValidator, validate, handleGetFavorite);
router.post("/", authenticate, upsertFavoriteValidator, validate, handleUpsertFavorite);
router.delete("/:seriesId", authenticate, seriesIdParamValidator, validate, handleDeleteFavorite);

export default router;
