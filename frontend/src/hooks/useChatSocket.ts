import { useEffect, useRef, useSyncExternalStore } from "react";
import { getSocket, subscribeToSocket } from "@/api/socket";
import { useChatStore } from "@/store/chatStore";
import { fetchChatMessages } from "@/api/chat";
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
    const setOnlineCount = useChatStore((s) => s.setOnlineCount);
    const connectedCountRef = useRef(0);

    useEffect(() => {
        if (!socket) return;

        const handleConnect = () => {
            connectedCountRef.current += 1;
            if (connectedCountRef.current === 1) return;
            fetchChatMessages()
                .then((data) => {
                    [...data.messages].reverse().forEach((m) => addMessage(m));
                })
                .catch(() => {});
        };

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

        const handleOnlineCount = (payload: { count: number }) => {
            setOnlineCount(payload.count);
        };

        socket.on("connect", handleConnect);
        socket.on("chat:message", handleMessage);
        socket.on("chat:message_deleted", handleMessageDeleted);
        socket.on("chat:user_muted", handleUserMuted);
        socket.on("chat:user_unmuted", handleUserUnmuted);
        socket.on("chat:online_count", handleOnlineCount);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("chat:message", handleMessage);
            socket.off("chat:message_deleted", handleMessageDeleted);
            socket.off("chat:user_muted", handleUserMuted);
            socket.off("chat:user_unmuted", handleUserUnmuted);
            socket.off("chat:online_count", handleOnlineCount);
        };
    }, [socket, addMessage, markMessageDeleted, setUserMuted, setUserUnmuted, setOnlineCount]);

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