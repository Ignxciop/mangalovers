import webpush from "web-push";
import pLimit from "p-limit";
import { config } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import logger from "../config/logger.js";
import { createNotification } from "./notificationService.js";

try {
    logger.info("Inicializando VAPID...");

    webpush.setVapidDetails(
        `mailto:${config.VAPID_EMAIL}`,
        config.VAPID_PUBLIC_KEY,
        config.VAPID_PRIVATE_KEY,
    );

    logger.info("VAPID configurado correctamente");
} catch (error) {
    logger.error({ err: error }, "Error configurando VAPID");
    logger.warn("Push notifications DESACTIVADAS temporalmente");
}

export async function subscribe({ userId, endpoint, p256dh, auth }) {
    const existing = await prisma.pushSubscription.findUnique({
        where: { endpoint },
    });

    if (existing) {
        return prisma.pushSubscription.update({
            where: { endpoint },
            data: { p256dh, auth, userId },
        });
    }

    return prisma.pushSubscription.create({
        data: { userId, endpoint, p256dh, auth },
    });
}

export async function unsubscribe({ userId, endpoint }) {
    return prisma.pushSubscription.deleteMany({
        where: { userId, endpoint },
    });
}

export async function isSubscribed({ userId, endpoint }) {
    const subscription = await prisma.pushSubscription.findFirst({
        where: { userId, endpoint },
        select: { id: true },
    });
    return !!subscription;
}

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
            logger.warn({ subscriptionId: subscription.id, statusCode: error.statusCode }, "Suscripción inválida, eliminando");
            await prisma.pushSubscription.delete({
                where: { id: subscription.id },
            }).catch(() => {});
            return { success: false, expired: true };
        }

        logger.error({ subscriptionId: subscription.id }, "Error enviando push");
        return { success: false, expired: false, error: error.message };
    }
}

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
    if (!config.VAPID_PUBLIC_KEY || !config.VAPID_PRIVATE_KEY) {
        logger.warn("Push omitido: VAPID no configurado");
        return;
    }

    const favorites = await prisma.userFavorite.findMany({
        where: { seriesId },
        select: { userId: true },
    });
    const userIds = favorites.map((f) => f.userId);

    if (userIds.length === 0)
        return { total: 0, sent: 0, failed: 0, expired: 0 };

    const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: { in: userIds } },
    });

    if (subscriptions.length === 0)
        return { total: 0, sent: 0, failed: 0, expired: 0 };

    const payload = buildNewChapterPayload({
        seriesId,
        seriesName,
        chapterName,
        slug,
    });

    const pushLimit = pLimit(50);
    const results = await Promise.allSettled(
        subscriptions.map((sub) => pushLimit(() => sendToSubscription(sub, payload))),
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

    logger.info({ seriesName, chapterName, sent: summary.sent, total: summary.total }, "Push enviado");

    Promise.allSettled(
        userIds.map((uid) =>
            createNotification({
                userId: uid,
                type: "NEW_CHAPTER",
                title: seriesName,
                body: `Nuevo capítulo disponible: ${chapterName}`,
                data: { seriesId, slug, chapterName },
            })
        ),
    ).catch((err) => logger.warn({ err }, "Error creando notificaciones in-app"));

    return summary;
}

export async function sendFriendRequestPush(senderId, receiverId) {
    if (!config.VAPID_PUBLIC_KEY || !config.VAPID_PRIVATE_KEY) return;

    const [sender, subscriptions] = await Promise.all([
        prisma.user.findUnique({
            where: { id: senderId },
            select: { name: true, lastname: true },
        }),
        prisma.pushSubscription.findMany({
            where: { userId: receiverId },
        }),
    ]);

    if (!sender || subscriptions.length === 0) return;

    const payload = {
        title: "Nueva solicitud de amistad",
        body: `${sender.name} ${sender.lastname} te envió una solicitud de amistad`,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        tag: "friend-request",
        data: { url: "/amigos" },
    };

    for (const subscription of subscriptions) {
        try {
            await webpush.sendNotification(
                { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
                JSON.stringify(payload),
            );
        } catch (error) {
            if (error.statusCode === 410 || error.statusCode === 404) {
                await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {});
            }
            logger.warn({ subscriptionId: subscription.id }, "Error enviando push de solicitud de amistad");
        }
    }
}
