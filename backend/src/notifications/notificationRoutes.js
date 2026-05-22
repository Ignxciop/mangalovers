import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import {
  getVapidPublicKey, subscribeHandler,
  unsubscribeHandler, getSubscriptionStatus,
} from "./notificationController.js";
import {
  subscribeValidator, unsubscribeValidator, subscriptionStatusValidator,
} from "./notificationValidator.js";
import { validate } from "../utils/validate.js";

const router = Router();

router.get("/vapid-public-key", getVapidPublicKey);
router.post("/subscribe", authenticate, subscribeValidator, validate, subscribeHandler);
router.delete("/unsubscribe", authenticate, unsubscribeValidator, validate, unsubscribeHandler);
router.get("/status", authenticate, subscriptionStatusValidator, validate, getSubscriptionStatus);

export default router;
