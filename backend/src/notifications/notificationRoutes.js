import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import {
    getVapidPublicKey,
    subscribeHandler,
    unsubscribeHandler,
    getSubscriptionStatus,
} from "./notificationController.js";

const router = Router();

// Pública: el frontend necesita esta key antes de autenticarse para suscribirse
router.get("/vapid-public-key", getVapidPublicKey);

// Protegidas: requieren usuario autenticado
router.post("/subscribe", authenticate, subscribeHandler);
router.delete("/unsubscribe", authenticate, unsubscribeHandler);
router.get("/status", authenticate, getSubscriptionStatus);

export default router;
