import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../utils/validate.js";
import { listUsersValidator, updateRoleValidator, updateStatusValidator } from "./adminUserValidator.js";
import { listUsers, updateRole, updateStatus, getStatusHistory } from "./adminUserController.js";
import { getMetrics, getOverview, getScraperMetrics, getUserMetrics, getContentMetrics, getSystemMetrics } from "./adminMetricsController.js";
import { ActivityLogService } from "../activityLog/activityLogService.js";

const isDev = process.env.ENVIRONMENT === "development" || process.env.NODE_ENV === "development";

const adminLimiter = isDev
  ? (req, res, next) => next()
  : rateLimit({
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
router.get("/metrics/overview", authenticate, authorize("ADMIN"), getOverview);
router.get("/metrics/scrapers", authenticate, authorize("ADMIN"), getScraperMetrics);
router.get("/metrics/users", authenticate, authorize("ADMIN"), getUserMetrics);
router.get("/metrics/content", authenticate, authorize("ADMIN"), getContentMetrics);
router.get("/metrics/system", authenticate, authorize("ADMIN"), getSystemMetrics);
router.get("/users", authenticate, authorize("ADMIN"), listUsersValidator, validate, listUsers);
router.patch("/users/:id/role", authenticate, authorize("ADMIN"), updateRoleValidator, validate, updateRole);
router.patch("/users/:id/status", authenticate, authorize("ADMIN"), updateStatusValidator, validate, updateStatus);
router.get("/users/:id/status-history", authenticate, authorize("ADMIN"), getStatusHistory);

export default router;
