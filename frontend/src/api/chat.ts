import { api } from "./axios";

export interface ChatUser {
    id: string;
    alias: string | null;
    avatarUrl: string | null;
}

export interface ChatMessage {
    id: number;
    content: string;
    isSpoiler: boolean;
    createdAt: string;
    user: ChatUser | null;
}

export interface ChatMessagesData {
    messages: ChatMessage[];
    nextCursor: number | null;
}

export type ChatReportReason = "OFFENSIVE_LANGUAGE" | "UNMARKED_SPOILER" | "OTHER";

export async function fetchChatMessages(
    cursor?: number,
    limit = 30,
): Promise<ChatMessagesData> {
    const params: Record<string, number> = { limit };
    if (cursor !== undefined) params.cursor = cursor;
    const { data } = await api.get<{ success: boolean; data: ChatMessagesData }>(
        "/chat/messages",
        { params },
    );
    return data.data;
}

export interface SelfMuteInfo {
    mutedUntil: string | null;
    reason: string | null;
}

export async function fetchSelfMute(): Promise<SelfMuteInfo | null> {
    const { data } = await api.get<{ success: boolean; data: SelfMuteInfo | null }>(
        "/chat/me/mute",
    );
    return data.data;
}

export async function reportChatMessage(
    messageId: number,
    reason: ChatReportReason,
    description?: string,
) {
    const { data } = await api.post(`/chat/messages/${messageId}/report`, {
        reason,
        description,
    });
    return data;
}