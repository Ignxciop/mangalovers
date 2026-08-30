import { Router } from "express";
import { handleGetMessages } from "./chatController.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../utils/validate.js";
import { getMessagesValidator } from "./chatValidator.js";

const router = Router();

router.get(
  "/messages",
  authenticate,
  getMessagesValidator,
  validate,
  handleGetMessages,
);

export default router;