import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { getSocket, subscribeToSocket } from "@/api/socket";
import { useFriendStore } from "@/store/friendStore";

function toastPresence(displayName: string | undefined, userId: string, kind: "online" | "offline") {
    const name = displayName ?? "Un amigo";
    const message = kind === "online" ? `${name} se ha conectado` : `${name} se ha desconectado`;
    toast(message, { id: `pres:${userId}:${kind}`, duration: 3000 });
}

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
            toastPresence(data.displayName, data.userId, "online");
        };

        const handleOffline = (data: { userId: string; displayName?: string }) => {
            removeOnlineFriend(data.userId);
            toastPresence(data.displayName, data.userId, "offline");
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
