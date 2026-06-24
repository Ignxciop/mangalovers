import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { getSocket, subscribeToSocket } from "@/api/socket";
import { useNotificationStore } from "@/store/notificationStore";
import { useFriendStore } from "@/store/friendStore";
import { isInAppEnabled } from "@/lib/inAppNotifications";

export function useSocketNotifications() {
    const socket = useSyncExternalStore(subscribeToSocket, getSocket, getSocket);
    const incrementUnread = useNotificationStore((s) => s.incrementUnread);
    const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
    const setPendingCount = useFriendStore((s) => s.setPendingCount);

    useEffect(() => {
        if (!socket) return;

        const handleNew = (data: { type: string; title: string; body?: string }) => {
            incrementUnread();
            if (isInAppEnabled()) {
                toast(data.title, {
                    description: data.body,
                    duration: 5000,
                });
            }
        };

        const handleUnreadCount = (data: { count: number }) => {
            setUnreadCount(data.count);
        };

        const handlePendingCount = (data: { count: number }) => {
            setPendingCount(data.count);
        };

        socket.on("notification:new", handleNew);
        socket.on("unread:count", handleUnreadCount);
        socket.on("friend:pending_count", handlePendingCount);

        return () => {
            socket.off("notification:new", handleNew);
            socket.off("unread:count", handleUnreadCount);
            socket.off("friend:pending_count", handlePendingCount);
        };
    }, [socket, incrementUnread, setUnreadCount, setPendingCount]);
}
