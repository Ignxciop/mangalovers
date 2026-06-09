import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { getSocket, subscribeToSocket } from "@/api/socket";
import { useFriendStore } from "@/store/friendStore";
import { isInAppEnabled } from "@/lib/inAppNotifications";

export function usePresence() {
    const socket = useSyncExternalStore(subscribeToSocket, getSocket, getSocket);
    const setOnlineFriends = useFriendStore((s) => s.setOnlineFriends);
    const addOnlineFriend = useFriendStore((s) => s.addOnlineFriend);
    const removeOnlineFriend = useFriendStore((s) => s.removeOnlineFriend);

    useEffect(() => {
        if (!socket) return;

        const handleOnlineList = (data: { userIds: string[] }) => {
            setOnlineFriends(data.userIds);
        };

        const handleOnline = (data: { userId: string; displayName?: string }) => {
            addOnlineFriend(data.userId);
            if (isInAppEnabled()) {
                toast(`${data.displayName ?? "Un amigo"} se ha conectado`, {
                    duration: 3000,
                });
            }
        };

        const handleOffline = (data: { userId: string; displayName?: string }) => {
            removeOnlineFriend(data.userId);
            if (isInAppEnabled()) {
                toast(`${data.displayName ?? "Un amigo"} se ha desconectado`, {
                    duration: 3000,
                });
            }
        };

        socket.on("presence:online_list", handleOnlineList);
        socket.on("friend:online", handleOnline);
        socket.on("friend:offline", handleOffline);

        return () => {
            socket.off("presence:online_list", handleOnlineList);
            socket.off("friend:online", handleOnline);
            socket.off("friend:offline", handleOffline);
        };
    }, [socket, setOnlineFriends, addOnlineFriend, removeOnlineFriend]);
}
