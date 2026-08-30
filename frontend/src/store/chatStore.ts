import { create } from "zustand";
import type { ChatMessage } from "@/api/chat";

interface ChatState {
    messages: ChatMessage[];
    nextCursor: number | null;
    setMessages: (messages: ChatMessage[], nextCursor: number | null) => void;
    prependMessages: (older: ChatMessage[], nextCursor: number | null) => void;
    addMessage: (message: ChatMessage) => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    nextCursor: null,
    setMessages: (messages, nextCursor) => set({ messages, nextCursor }),
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
}));