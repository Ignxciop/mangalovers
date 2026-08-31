import { Router } from "express";
import {
  handleGetChatReports,
  handleGetChatPendingCount,
  handleResolveChatReport,
} from "./chatReportController.js";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../utils/validate.js";
import { resolveChatReportValidator } from "./chatReportValidator.js";

export const adminChatReportRoutes = Router();

adminChatReportRoutes.get(
  "/reports",
  authenticate,
  authorize("ADMIN"),
  handleGetChatReports,
);

adminChatReportRoutes.get(
  "/reports/pending-count",
  authenticate,
  authorize("ADMIN"),
  handleGetChatPendingCount,
);

adminChatReportRoutes.patch(
  "/reports/:id",
  authenticate,
  authorize("ADMIN"),
  resolveChatReportValidator,
  validate,
  handleResolveChatReport,
);