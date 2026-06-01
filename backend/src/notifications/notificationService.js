import { prisma } from "../config/prisma.js";

export async function createNotification({ userId, type, title, body, data }) {
    return prisma.notification.create({
        data: { userId, type, title, body, data: data ?? undefined },
    });
}

export async function getNotifications(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
        }),
        prisma.notification.count({ where: { userId } }),
    ]);

    return { data, total };
}

export async function getUnreadCount(userId) {
    return prisma.notification.count({
        where: { userId, read: false },
    });
}

export async function markAsRead(userId, notificationId) {
    const notification = await prisma.notification.findFirst({
        where: { id: notificationId, userId },
    });
    if (!notification) return null;

    return prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
    });
}

export async function markAllAsRead(userId) {
    await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
    });
}
