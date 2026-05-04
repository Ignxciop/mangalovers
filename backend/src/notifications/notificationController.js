import { config } from "../config/env.js";
import { subscribe, unsubscribe, isSubscribed } from "./notificationService.js";

/**
 * GET /notifications/vapid-public-key
 * Retorna la clave pública VAPID. Ruta pública (sin auth).
 */
export async function getVapidPublicKey(req, res) {
    return res.json({ publicKey: config.VAPID_PUBLIC_KEY });
}

/**
 * POST /notifications/subscribe
 * Registra o actualiza la suscripción push del dispositivo actual.
 *
 * Body: { endpoint: string, keys: { p256dh: string, auth: string } }
 */
export async function subscribeHandler(req, res) {
    const { endpoint, keys } = req.body;
    const userId = req.user.id;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({
            error: "Faltan campos requeridos: endpoint, keys.p256dh, keys.auth",
        });
    }

    try {
        const subscription = await subscribe({
            userId,
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
        });

        return res.status(201).json({ ok: true, id: subscription.id });
    } catch (error) {
        console.error("Error en subscribeHandler:", error);
        return res
            .status(500)
            .json({ error: "No se pudo guardar la suscripción" });
    }
}

/**
 * DELETE /notifications/unsubscribe
 * Elimina la suscripción push del dispositivo actual.
 *
 * Body: { endpoint: string }
 */
export async function unsubscribeHandler(req, res) {
    const { endpoint } = req.body;
    const userId = req.user.id;

    if (!endpoint) {
        return res.status(400).json({ error: "Falta el campo endpoint" });
    }

    try {
        await unsubscribe({ userId, endpoint });
        return res.json({ ok: true });
    } catch (error) {
        console.error("Error en unsubscribeHandler:", error);
        return res
            .status(500)
            .json({ error: "No se pudo eliminar la suscripción" });
    }
}

/**
 * GET /notifications/status?endpoint=<url>
 * Verifica si el usuario tiene suscripción activa para el endpoint dado.
 */
export async function getSubscriptionStatus(req, res) {
    const { endpoint } = req.query;
    const userId = req.user.id;

    if (!endpoint) {
        return res.status(400).json({ error: "Falta el parámetro endpoint" });
    }

    try {
        const subscribed = await isSubscribed({ userId, endpoint });
        return res.json({ subscribed });
    } catch (error) {
        console.error("Error en getSubscriptionStatus:", error);
        return res.status(500).json({ error: "Error verificando suscripción" });
    }
}
