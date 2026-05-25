import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../utils/validate.js";
import { listUsersValidator, updateRoleValidator } from "./adminUserValidator.js";
import { listUsers, updateRole } from "./adminUserController.js";
import { getMetrics } from "./adminMetricsController.js";

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Demasiadas solicitudes, intenta de nuevo más tarde" },
});

const router = Router();

router.use(adminLimiter);

router.get("/metrics", authenticate, authorize("ADMIN"), getMetrics);
router.get("/users", authenticate, authorize("ADMIN"), listUsersValidator, validate, listUsers);
router.patch("/users/:id/role", authenticate, authorize("ADMIN"), updateRoleValidator, validate, updateRole);

export default router;
