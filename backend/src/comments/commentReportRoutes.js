import { Router } from "express";
import {
  handleCreateReport,
  handleGetReports,
  handleGetPendingCount,
  handleResolveReport,
} from "./commentReportController.js";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../utils/validate.js";
import { reportCommentValidator, resolveReportValidator } from "./commentReportValidator.js";

const router = Router();

router.post(
  "/:id/report",
  authenticate,
  reportCommentValidator,
  validate,
  handleCreateReport,
);

export default router;

export const adminReportRoutes = Router();

adminReportRoutes.get(
  "/reports",
  authenticate,
  authorize("ADMIN"),
  handleGetReports,
);

adminReportRoutes.get(
  "/reports/pending-count",
  authenticate,
  authorize("ADMIN"),
  handleGetPendingCount,
);

adminReportRoutes.patch(
  "/reports/:id",
  authenticate,
  authorize("ADMIN"),
  resolveReportValidator,
  validate,
  handleResolveReport,
);
