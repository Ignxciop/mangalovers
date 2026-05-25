import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../utils/validate.js";
import { ActivityLogService } from "../activityLog/activityLogService.js";
import {
  createSuggestionValidator,
  updateStatusValidator,
  listSuggestionsValidator,
} from "./suggestionValidator.js";
import {
  create,
  getMySuggestions,
  getAll,
  updateStatus,
} from "./suggestionController.js";

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    if (req.user?.userId) {
      try {
        await ActivityLogService.logEvent(
          req.user.userId, "RATE_LIMIT",
          { route: req.originalUrl, method: req.method },
          req.ip, req.headers["user-agent"],
        );
      } catch { /* ignore */ }
    }
    res.status(429).json({ success: false, message: "Demasiadas sugerencias, intenta de nuevo más tarde" });
  },
});

const router = Router();

router.post("/", createLimiter, authenticate, createSuggestionValidator, validate, create);
router.get("/mine", authenticate, getMySuggestions);
router.get("/", authenticate, authorize("ADMIN"), listSuggestionsValidator, validate, getAll);
router.patch("/:id/status", authenticate, authorize("ADMIN"), updateStatusValidator, validate, updateStatus);

export default router;
