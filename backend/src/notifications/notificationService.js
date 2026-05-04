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

// ── CONFIGURACIÓN SEGURA DE VAPID ─────────────────────────

// FIX: evitar crash + mostrar logs reales
try {
    console.log("Inicializando VAPID...");
    console.log("PUBLIC KEY:", config.VAPID_PUBLIC_KEY);
    console.log("PUBLIC KEY LENGTH:", config.VAPID_PUBLIC_KEY?.length);
    console.log("PRIVATE KEY LENGTH:", config.VAPID_PRIVATE_KEY?.length);

    webpush.setVapidDetails(
        `mailto:${config.VAPID_EMAIL}`,
        config.VAPID_PUBLIC_KEY,
        config.VAPID_PRIVATE_KEY,
    );

    console.log("VAPID configurado correctamente");
} catch (error) {
    console.error("Error configurando VAPID:");
    console.error(error.message);

    // IMPORTANTE: no crashear el server
    console.warn("Push notifications DESACTIVADAS temporalmente");
}

// ── Suscripciones ─────────────────────────────────────────

export async function subscribe({ userId, endpoint, p256dh, auth }) {
    return upsertSubscription({ userId, endpoint, p256dh, auth });
}

export async function unsubscribe({ userId, endpoint }) {
    return deleteSubscription({ userId, endpoint });
}

export async function isSubscribed({ userId, endpoint }) {
    const subscription = await findSubscription({ userId, endpoint });
    return !!subscription;
}

// ── Envío ─────────────────────────────────────────────────

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
        if (error.statusCode === 410 || error.statusCode === 404) {
            console.warn(
                `Suscripción inválida (${error.statusCode}), eliminando id=${subscription.id}`,
            );
            await deleteSubscriptionById(subscription.id);
            return { success: false, expired: true };
        }

        console.error(
            `Error enviando push a id=${subscription.id}:`,
            error.message,
        );
        return { success: false, expired: false, error: error.message };
    }
}

// CAMBIO CLAVE: ahora usa slug
function buildNewChapterPayload({ seriesId, seriesName, chapterName, slug }) {
    return {
        title: seriesName,
        body: `Nuevo capítulo disponible: ${chapterName}`,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        tag: `series-${seriesId}`,
        renotify: true,
        data: {
            url: `/manga/${slug}`,
            seriesId,
        },
    };
}

export async function notifyNewChapter({
    seriesId,
    seriesName,
    chapterName,
    slug,
}) {
    // Si VAPID falló, no intentar enviar
    if (!config.VAPID_PUBLIC_KEY || !config.VAPID_PRIVATE_KEY) {
        console.warn("⚠️ Push omitido: VAPID no configurado");
        return;
    }

    const userIds = await findFavoriteUserIdsBySeriesId(seriesId);
    if (userIds.length === 0)
        return { total: 0, sent: 0, failed: 0, expired: 0 };

    const subscriptions = await findSubscriptionsByUserIds(userIds);
    if (subscriptions.length === 0)
        return { total: 0, sent: 0, failed: 0, expired: 0 };

    const payload = buildNewChapterPayload({
        seriesId,
        seriesName,
        chapterName,
        slug,
    });

    const results = await Promise.allSettled(
        subscriptions.map((sub) => sendToSubscription(sub, payload)),
    );

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
            `${summary.sent}/${summary.total} enviados`,
    );

    return summary;
}
