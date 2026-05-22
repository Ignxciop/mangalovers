import { Router } from "express";
import {
  register, login, googleLogin, refresh,
  logout, logoutAll, getMe, getActiveSessions,
  updateProfile, updatePassword, deleteAccount, getGoogleClientId,
} from "./authController.js";
import {
  registerValidator, loginValidator, googleLoginValidator,
  updateProfileValidator, updatePasswordValidator, deleteAccountValidator,
} from "./authValidator.js";
import { validate } from "../utils/validate.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/google-client-id", getGoogleClientId);
router.post("/register", registerValidator, validate, register);
router.post("/login", loginValidator, validate, login);
router.post("/google", googleLoginValidator, validate, googleLogin);
router.post("/refresh", refresh);
router.post("/logout", authenticate, logout);
router.post("/logout-all", authenticate, logoutAll);
router.get("/me", authenticate, getMe);
router.get("/sessions", authenticate, getActiveSessions);
router.patch("/profile", authenticate, updateProfileValidator, validate, updateProfile);
router.patch("/password", authenticate, updatePasswordValidator, validate, updatePassword);
router.delete("/account", authenticate, deleteAccountValidator, validate, deleteAccount);

export default router;
