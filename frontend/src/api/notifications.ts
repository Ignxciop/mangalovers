import { api } from "./axios";

export interface AppNotification {
    id: string;
    userId: string;
    type: "FRIEND_REQUEST" | "FRIEND_ACCEPTED" | "SUGGESTION_RESOLVED" | "NEW_CHAPTER" | "COMMENT_REPLY" | "SERIES_RELATION";
    title: string;
    body: string | null;
    data: Record<string, unknown> | null;
    read: boolean;
    createdAt: string;
}

export async function getNotifications(page = 1, limit = 20): Promise<{ data: AppNotification[]; total: number }> {
    const { data } = await api.get<{ success: boolean; data: AppNotification[]; total: number }>("/notifications", {
        params: { page, limit },
    });
    return { data: data.data, total: data.total };
}

export async function getUnreadNotificationCount(): Promise<number> {
    const { data } = await api.get<{ success: boolean; data: { count: number } }>("/notifications/unread-count");
    return data.data.count;
}

export async function markNotificationAsRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsAsRead(): Promise<void> {
    await api.post("/notifications/read-all");
}
