import { prisma } from "../config/prisma.js";

/**
 * Guarda o actualiza una suscripción push.
 * Usa upsert por endpoint (único por dispositivo/browser).
 */
export async function upsertSubscription({ userId, endpoint, p256dh, auth }) {
    return prisma.pushSubscription.upsert({
        where: { endpoint },
        update: { p256dh, auth, userId },
        create: { userId, endpoint, p256dh, auth },
    });
}

/**
 * Elimina la suscripción de un usuario para un endpoint específico.
 */
export async function deleteSubscription({ userId, endpoint }) {
    return prisma.pushSubscription.deleteMany({
        where: { userId, endpoint },
    });
}

/**
 * Elimina una suscripción por su ID (usado cuando el push service la rechaza).
 */
export async function deleteSubscriptionById(id) {
    return prisma.pushSubscription.delete({
        where: { id },
    });
}

/**
 * Verifica si existe una suscripción activa para un usuario + endpoint.
 */
export async function findSubscription({ userId, endpoint }) {
    return prisma.pushSubscription.findFirst({
        where: { userId, endpoint },
        select: { id: true },
    });
}

/**
 * Obtiene todas las suscripciones activas de una lista de userIds.
 */
export async function findSubscriptionsByUserIds(userIds) {
    return prisma.pushSubscription.findMany({
        where: { userId: { in: userIds } },
    });
}

/**
 * Obtiene los userIds de todos los usuarios que tienen una serie en favoritos.
 */
export async function findFavoriteUserIdsBySeriesId(seriesId) {
    const favorites = await prisma.userFavorite.findMany({
        where: { seriesId },
        select: { userId: true },
    });
    return favorites.map((f) => f.userId);
}
