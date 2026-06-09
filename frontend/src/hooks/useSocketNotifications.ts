import { useEffect } from "react";
import { toast } from "sonner";
import { getSocket } from "@/api/socket";
import { useNotificationStore } from "@/store/notificationStore";

export function useSocketNotifications() {
    const incrementUnread = useNotificationStore((s) => s.incrementUnread);
    const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleNew = (data: { title: string; body?: string }) => {
            incrementUnread();
            toast(data.title, {
                description: data.body,
                duration: 5000,
            });
        };

        const handleCount = (data: { count: number }) => {
            setUnreadCount(data.count);
        };

        socket.on("notification:new", handleNew);
        socket.on("unread:count", handleCount);

        return () => {
            socket.off("notification:new", handleNew);
            socket.off("unread:count", handleCount);
        };
    }, [incrementUnread, setUnreadCount]);
}
