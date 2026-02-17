import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import {
    registerValidator,
    loginValidator,
    validate,
} from "../validators/authValidator.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.post("/register", registerValidator, validate, AuthController.register);
router.post("/login", loginValidator, validate, AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthController.logout);
router.post("/logout-all", authenticate, AuthController.logoutAll);
router.get("/me", authenticate, AuthController.getMe);
router.get("/sessions", authenticate, AuthController.getActiveSessions);

export default router;
