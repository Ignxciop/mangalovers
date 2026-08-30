import { useEffect, useSyncExternalStore } from "react";
import { getSocket, subscribeToSocket } from "@/api/socket";
import { useChatStore } from "@/store/chatStore";
import type { ChatMessage } from "@/api/chat";

interface SendResult {
    ok: boolean;
    message?: ChatMessage;
    error?: string;
    mutedUntil?: string | null;
}

export function useChatSocket() {
    const socket = useSyncExternalStore(subscribeToSocket, getSocket, getSocket);
    const addMessage = useChatStore((s) => s.addMessage);
    const markMessageDeleted = useChatStore((s) => s.markMessageDeleted);
    const setUserMuted = useChatStore((s) => s.setUserMuted);
    const setUserUnmuted = useChatStore((s) => s.setUserUnmuted);

    useEffect(() => {
        if (!socket) return;

        const handleMessage = (message: ChatMessage) => {
            addMessage(message);
        };

        const handleMessageDeleted = (payload: { id: number }) => {
            markMessageDeleted(payload.id);
        };

        const handleUserMuted = (payload: {
            userId: string;
            mutedUntil: string | null;
            reason?: string | null;
        }) => {
            setUserMuted(payload.userId, payload.mutedUntil, payload.reason ?? null);
        };

        const handleUserUnmuted = (payload: { userId: string }) => {
            setUserUnmuted(payload.userId);
        };

        socket.on("chat:message", handleMessage);
        socket.on("chat:message_deleted", handleMessageDeleted);
        socket.on("chat:user_muted", handleUserMuted);
        socket.on("chat:user_unmuted", handleUserUnmuted);

        return () => {
            socket.off("chat:message", handleMessage);
            socket.off("chat:message_deleted", handleMessageDeleted);
            socket.off("chat:user_muted", handleUserMuted);
            socket.off("chat:user_unmuted", handleUserUnmuted);
        };
    }, [socket, addMessage, markMessageDeleted, setUserMuted, setUserUnmuted]);

    const sendMessage = (content: string, isSpoiler = false): Promise<SendResult> => {
        return new Promise((resolve) => {
            if (!socket) {
                resolve({ ok: false, error: "SOCKET_DISCONNECTED" });
                return;
            }
            socket.emit(
                "chat:send",
                { content, isSpoiler },
                (ack: SendResult) => resolve(ack),
            );
        });
    };

    return { sendMessage };
}