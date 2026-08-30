import { Router } from "express";
import {
  handleDeleteChatMessage,
  handleMuteChatUser,
  handleUnmuteChatUser,
} from "./chatModerationController.js";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../utils/validate.js";
import {
  deleteChatMessageValidator,
  muteChatUserValidator,
  unmuteChatUserValidator,
} from "./chatModerationValidator.js";

export const adminChatModerationRoutes = Router();

adminChatModerationRoutes.delete(
  "/messages/:id",
  authenticate,
  authorize("ADMIN"),
  deleteChatMessageValidator,
  validate,
  handleDeleteChatMessage,
);

adminChatModerationRoutes.post(
  "/mutes",
  authenticate,
  authorize("ADMIN"),
  muteChatUserValidator,
  validate,
  handleMuteChatUser,
);

adminChatModerationRoutes.delete(
  "/mutes/:userId",
  authenticate,
  authorize("ADMIN"),
  unmuteChatUserValidator,
  validate,
  handleUnmuteChatUser,
);