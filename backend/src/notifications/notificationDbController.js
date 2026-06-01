import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
} from "./notificationService.js";

export async function listNotifications(req, res, next) {
    try {
        const { page = 1, limit = 20 } = req.query;
        const result = await getNotifications(req.user.userId, Number(page), Number(limit));
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
}

export async function unreadCount(req, res, next) {
    try {
        const count = await getUnreadCount(req.user.userId);
        res.json({ success: true, data: { count } });
    } catch (error) {
        next(error);
    }
}

export async function readNotification(req, res, next) {
    try {
        const notification = await markAsRead(req.user.userId, req.params.id);
        if (!notification) {
            return res.status(404).json({ success: false, message: "Notificación no encontrada" });
        }
        res.json({ success: true, data: notification });
    } catch (error) {
        next(error);
    }
}

export async function readAllNotifications(req, res, next) {
    try {
        await markAllAsRead(req.user.userId);
        res.json({ success: true, message: "Todas las notificaciones marcadas como leídas" });
    } catch (error) {
        next(error);
    }
}
