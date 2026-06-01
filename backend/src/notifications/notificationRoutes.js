import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import {
  getVapidPublicKey, subscribeHandler,
  unsubscribeHandler, getSubscriptionStatus,
} from "./notificationController.js";
import {
  listNotifications, unreadCount,
  readNotification, readAllNotifications,
} from "./notificationDbController.js";
import {
  subscribeValidator, unsubscribeValidator, subscriptionStatusValidator,
  paginationValidator, idParamValidator,
} from "./notificationValidator.js";
import { validate } from "../utils/validate.js";

const router = Router();

// Push
router.get("/vapid-public-key", getVapidPublicKey);
router.post("/subscribe", authenticate, subscribeValidator, validate, subscribeHandler);
router.delete("/unsubscribe", authenticate, unsubscribeValidator, validate, unsubscribeHandler);
router.get("/status", authenticate, subscriptionStatusValidator, validate, getSubscriptionStatus);

// In-app
router.get("/", authenticate, paginationValidator, validate, listNotifications);
router.get("/unread-count", authenticate, unreadCount);
router.patch("/:id/read", authenticate, idParamValidator, validate, readNotification);
router.post("/read-all", authenticate, readAllNotifications);

export default router;
