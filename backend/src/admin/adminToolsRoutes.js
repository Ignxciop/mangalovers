import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { fixEmptyChapters } from "./adminToolsController.js";
import { ActivityLogService } from "../activityLog/activityLogService.js";

const toolsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
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
    res.status(429).json({ success: false, message: "Demasiadas solicitudes, intenta de nuevo más tarde" });
  },
});

const router = Router();

router.post("/tools/fix-empty-chapters", toolsLimiter, authenticate, authorize("ADMIN"), fixEmptyChapters);

export default router;
