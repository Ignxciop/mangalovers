import webpush from "web-push";
import { config } from "../config/env.js";
import {
    upsertSubscription,
    deleteSubscription,
    findSubscription,
    findSubscriptionsByUserIds,
    findFavoriteUserIdsBySeriesId,
    deleteSubscriptionById,
} from "./notificationRepository.js";

// Configurar VAPID una sola vez al inicializar el módulo
webpush.setVapidDetails(
    `mailto:${config.VAPID_EMAIL}`,
    config.VAPID_PUBLIC_KEY,
    config.VAPID_PRIVATE_KEY,
);

// ── Suscripciones ─────────────────────────────────────────────────────────

/**
 * Registra o actualiza la suscripción push de un dispositivo.
 * Si el endpoint ya existe (mismo browser), actualiza las keys.
 */
export async function subscribe({ userId, endpoint, p256dh, auth }) {
    return upsertSubscription({ userId, endpoint, p256dh, auth });
}

/**
 * Elimina la suscripción push de un dispositivo para el usuario dado.
 */
export async function unsubscribe({ userId, endpoint }) {
    return deleteSubscription({ userId, endpoint });
}

/**
 * Verifica si un usuario tiene suscripción activa para un endpoint.
 * Retorna boolean.
 */
export async function isSubscribed({ userId, endpoint }) {
    const subscription = await findSubscription({ userId, endpoint });
    return !!subscription;
}

// ── Envío de notificaciones ───────────────────────────────────────────────

/**
 * Intenta enviar una notificación push a una suscripción individual.
 *
 * Retorna:
 *   { success: true }                          → enviado OK
 *   { success: false, expired: true }          → suscripción inválida (ya eliminada)
 *   { success: false, expired: false, error }  → fallo temporal (red, etc.)
 */
async function sendToSubscription(subscription, payload) {
    try {
        await webpush.sendNotification(
            {
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: subscription.p256dh,
                    auth: subscription.auth,
                },
            },
            JSON.stringify(payload),
        );
        return { success: true };
    } catch (error) {
        // 410 Gone / 404 Not Found → suscripción expirada o inválida permanentemente
        if (error.statusCode === 410 || error.statusCode === 404) {
            console.warn(
                `Suscripción inválida (${error.statusCode}), eliminando id=${subscription.id}`,
            );
            await deleteSubscriptionById(subscription.id);
            return { success: false, expired: true };
        }

        // Otros errores: fallo temporal → no eliminar
        console.error(
            `Error enviando push a id=${subscription.id}:`,
            error.message,
        );
        return { success: false, expired: false, error: error.message };
    }
}

/**
 * Construye el payload estándar de notificación para un capítulo nuevo.
 */
function buildNewChapterPayload({
    seriesId,
    seriesName,
    chapterName,
    chapterId,
}) {
    return {
        title: seriesName,
        body: `Nuevo capítulo disponible: ${chapterName}`,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        tag: `series-${seriesId}`, // agrupa: nueva notificación reemplaza la anterior
        renotify: true,
        data: {
            url: `/series/${seriesId}/chapter/${chapterId}`,
            seriesId,
            chapterId,
        },
    };
}

/**
 * Notifica a todos los usuarios que tienen `seriesId` en favoritos.
 * Llamado desde el scraper cuando se detecta un capítulo nuevo.
 *
 * Retorna un resumen { total, sent, failed, expired }.
 */
export async function notifyNewChapter({
    seriesId,
    seriesName,
    chapterName,
    chapterId,
}) {
    // 1. Usuarios con la serie en favoritos
    const userIds = await findFavoriteUserIdsBySeriesId(seriesId);
    if (userIds.length === 0)
        return { total: 0, sent: 0, failed: 0, expired: 0 };

    // 2. Suscripciones activas de esos usuarios
    const subscriptions = await findSubscriptionsByUserIds(userIds);
    if (subscriptions.length === 0)
        return { total: 0, sent: 0, failed: 0, expired: 0 };

    // 3. Payload
    const payload = buildNewChapterPayload({
        seriesId,
        seriesName,
        chapterName,
        chapterId,
    });

    // 4. Enviar en paralelo, cada una con su propio manejo de error
    const results = await Promise.allSettled(
        subscriptions.map((sub) => sendToSubscription(sub, payload)),
    );

    // 5. Consolidar métricas
    const summary = results.reduce(
        (acc, result) => {
            if (result.status === "fulfilled") {
                if (result.value.success) acc.sent++;
                else if (result.value.expired) acc.expired++;
                else acc.failed++;
            } else {
                acc.failed++;
            }
            return acc;
        },
        { total: subscriptions.length, sent: 0, failed: 0, expired: 0 },
    );

    console.log(
        `Push "${seriesName}" - ${chapterName}: ` +
            `${summary.sent}/${summary.total} enviados, ` +
            `${summary.expired} expirados eliminados, ${summary.failed} fallidos`,
    );

    return summary;
}
