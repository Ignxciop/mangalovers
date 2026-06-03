import { Router } from "express";
import { getProfile, getProfileFavorites, getProfileActivity } from "./userController.js";
import { optionalAuthenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/:alias", optionalAuthenticate, getProfile);
router.get("/:alias/favorites", optionalAuthenticate, getProfileFavorites);
router.get("/:alias/activity", optionalAuthenticate, getProfileActivity);

export default router;
