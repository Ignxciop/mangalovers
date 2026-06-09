import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { getSocket, subscribeToSocket } from "@/api/socket";
import { useNotificationStore } from "@/store/notificationStore";
import { useFriendStore } from "@/store/friendStore";

export function useSocketNotifications() {
    const socket = useSyncExternalStore(subscribeToSocket, getSocket, getSocket);
    const incrementUnread = useNotificationStore((s) => s.incrementUnread);
    const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
    const incrementPending = useFriendStore((s) => s.incrementPending);
    const decrementPending = useFriendStore((s) => s.decrementPending);

    useEffect(() => {
        if (!socket) return;

        const handleNew = (data: { type: string; title: string; body?: string }) => {
            incrementUnread();
            toast(data.title, {
                description: data.body,
                duration: 5000,
            });
            if (data.type === "FRIEND_REQUEST") {
                incrementPending();
            } else if (data.type === "FRIEND_ACCEPTED") {
                decrementPending();
            }
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
    }, [socket, incrementUnread, setUnreadCount, incrementPending, decrementPending]);
}
