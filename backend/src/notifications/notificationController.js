import { config } from "../config/env.js";
import { subscribe, unsubscribe, isSubscribed } from "./notificationService.js";

export async function getVapidPublicKey(req, res, next) {
  try {
    res.json({ success: true, data: { publicKey: config.VAPID_PUBLIC_KEY } });
  } catch (error) {
    next(error);
  }
}

export async function subscribeHandler(req, res, next) {
  try {
    const { endpoint, keys } = req.body;
    const userId = req.user.userId;

    const subscription = await subscribe({
      userId, endpoint, p256dh: keys.p256dh, auth: keys.auth,
    });

    res.status(201).json({ success: true, data: { id: subscription.id } });
  } catch (error) {
    next(error);
  }
}

export async function unsubscribeHandler(req, res, next) {
  try {
    const { endpoint } = req.body;
    const userId = req.user.userId;

    await unsubscribe({ userId, endpoint });
    res.json({ success: true, message: "Suscripción eliminada" });
  } catch (error) {
    next(error);
  }
}

export async function getSubscriptionStatus(req, res, next) {
  try {
    const { endpoint } = req.query;
    const userId = req.user.userId;

    const subscribed = await isSubscribed({ userId, endpoint });
    res.json({ success: true, data: { subscribed } });
  } catch (error) {
    next(error);
  }
}
