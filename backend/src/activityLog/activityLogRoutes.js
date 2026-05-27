import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { handleGetUserLogs, handleGetAllLogs, handleGetStatusHistory } from "./activityLogController.js";

const router = Router();

router.get("/users/:id/activity", authenticate, authorize("ADMIN"), handleGetUserLogs);
router.get("/users/:id/status-history", authenticate, authorize("ADMIN"), handleGetStatusHistory);
router.get("/logs", authenticate, authorize("ADMIN"), handleGetAllLogs);

export default router;
