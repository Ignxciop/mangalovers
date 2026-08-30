import { Router } from "express";
import { handleGetMessages, handleCreateChatReport } from "./chatController.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../utils/validate.js";
import { getMessagesValidator } from "./chatValidator.js";
import { reportChatMessageValidator } from "./chatReportValidator.js";

const router = Router();

router.get(
  "/messages",
  authenticate,
  getMessagesValidator,
  validate,
  handleGetMessages,
);

router.post(
  "/messages/:messageId/report",
  authenticate,
  reportChatMessageValidator,
  validate,
  handleCreateChatReport,
);

export default router;