import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../utils/validate.js";
import { listUsersValidator, updateRoleValidator, updateStatusValidator } from "./adminUserValidator.js";
import { listUsers, updateRole, updateStatus } from "./adminUserController.js";
import { getMetrics } from "./adminMetricsController.js";
import { ActivityLogService } from "../activityLog/activityLogService.js";

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
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

router.use(adminLimiter);

router.get("/metrics", authenticate, authorize("ADMIN"), getMetrics);
router.get("/users", authenticate, authorize("ADMIN"), listUsersValidator, validate, listUsers);
router.patch("/users/:id/role", authenticate, authorize("ADMIN"), updateRoleValidator, validate, updateRole);
router.patch("/users/:id/status", authenticate, authorize("ADMIN"), updateStatusValidator, validate, updateStatus);

export default router;
