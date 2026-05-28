import { Router } from "express";
import {
  register, login, googleLogin, refresh,
  logout, logoutAll, getMe, getMyStatus, getActiveSessions,
  updateProfile, updatePassword, updateAvatar, updateAlias, deleteAccount, getGoogleClientId,
} from "./authController.js";
import {
  registerValidator, loginValidator, googleLoginValidator,
  updateProfileValidator, updatePasswordValidator, deleteAccountValidator,
  updateAliasValidator,
} from "./authValidator.js";
import { validate } from "../utils/validate.js";
import { authenticate, authenticateBasic } from "../middlewares/auth.js";
import { upload } from "../middlewares/uploadAvatar.js";

const router = Router();

router.get("/google-client-id", getGoogleClientId);
router.post("/register", registerValidator, validate, register);
router.post("/login", loginValidator, validate, login);
router.post("/google", googleLoginValidator, validate, googleLogin);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/logout-all", authenticate, logoutAll);
router.get("/me", authenticate, getMe);
router.get("/status", authenticateBasic, getMyStatus);
router.get("/sessions", authenticate, getActiveSessions);
router.patch("/profile", authenticate, updateProfileValidator, validate, updateProfile);
router.patch("/password", authenticate, updatePasswordValidator, validate, updatePassword);
router.put("/avatar", authenticate, upload.single("avatar"), updateAvatar);
router.patch("/alias", authenticate, updateAliasValidator, validate, updateAlias);
router.delete("/account", authenticate, deleteAccountValidator, validate, deleteAccount);

export default router;
