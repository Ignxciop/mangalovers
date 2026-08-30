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

    useEffect(() => {
        if (!socket) return;

        const handleMessage = (message: ChatMessage) => {
            addMessage(message);
        };

        socket.on("chat:message", handleMessage);

        return () => {
            socket.off("chat:message", handleMessage);
        };
    }, [socket, addMessage]);

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