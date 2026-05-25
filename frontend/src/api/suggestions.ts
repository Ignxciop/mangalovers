import { api } from "./axios";
import type { SuggestionType, SuggestionStatus, SuggestionListResponse } from "@/types/suggestion";

interface CreateSuggestionPayload {
    type: SuggestionType;
    title: string;
    description: string;
    image?: string;
}

export async function createSuggestion(payload: CreateSuggestionPayload) {
    const { data } = await api.post("/suggestions", payload);
    return data;
}

export async function getMySuggestions(page = 1, limit = 20) {
    const { data } = await api.get<SuggestionListResponse>("/suggestions/mine", {
        params: { page, limit },
    });
    return data;
}

export async function getAllSuggestions(params?: {
    page?: number;
    limit?: number;
    type?: SuggestionType;
    status?: SuggestionStatus;
}) {
    const { data } = await api.get<SuggestionListResponse>("/suggestions", { params });
    return data;
}

export async function updateSuggestionStatus(id: number, status: SuggestionStatus) {
    const { data } = await api.patch(`/suggestions/${id}/status`, { status });
    return data;
}
