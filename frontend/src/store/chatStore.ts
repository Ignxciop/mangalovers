import { create } from "zustand";
import type { ChatMessage } from "@/api/chat";

export interface ChatMuteInfo {
    mutedUntil: string | null;
    reason: string | null;
}

interface ChatState {
    messages: ChatMessage[];
    nextCursor: number | null;
    deletedIds: number[];
    mutedUsers: Record<string, ChatMuteInfo>;
    setMessages: (messages: ChatMessage[], nextCursor: number | null) => void;
    prependMessages: (older: ChatMessage[], nextCursor: number | null) => void;
    addMessage: (message: ChatMessage) => void;
    markMessageDeleted: (id: number) => void;
    setUserMuted: (userId: string, mutedUntil: string | null, reason?: string | null) => void;
    setUserUnmuted: (userId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    nextCursor: null,
    deletedIds: [],
    mutedUsers: {},
    setMessages: (messages, nextCursor) =>
        set({ messages, nextCursor, deletedIds: [] }),
    prependMessages: (older, nextCursor) =>
        set((s) => {
            const ids = new Set(s.messages.map((m) => m.id));
            const unique = older.filter((m) => !ids.has(m.id));
            return { messages: [...unique, ...s.messages], nextCursor };
        }),
    addMessage: (message) =>
        set((s) => {
            if (s.messages.some((m) => m.id === message.id)) return s;
            return { messages: [...s.messages, message] };
        }),
    markMessageDeleted: (id) =>
        set((s) =>
            s.deletedIds.includes(id)
                ? s
                : { deletedIds: [...s.deletedIds, id] },
        ),
    setUserMuted: (userId, mutedUntil, reason = null) =>
        set((s) => ({
            mutedUsers: { ...s.mutedUsers, [userId]: { mutedUntil, reason } },
        })),
    setUserUnmuted: (userId) =>
        set((s) => {
            const next = { ...s.mutedUsers };
            delete next[userId];
            return { mutedUsers: next };
        }),
}));