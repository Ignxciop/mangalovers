export type SuggestionType = "BUG" | "SUGGESTION" | "CONTENT_ERROR" | "TECHNICAL_PROBLEM" | "OTHER";
export type SuggestionStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "REJECTED" | "CLOSED";

export interface Suggestion {
    id: number;
    type: SuggestionType;
    title: string;
    description: string;
    image: string | null;
    status: SuggestionStatus;
    adminResponse?: string | null;
    createdAt: string;
    updatedAt: string;
    userId?: string;
    reviewedById?: string | null;
    user?: {
        name: string;
        lastname: string;
        email: string;
    };
    reviewedBy?: {
        name: string;
        lastname: string;
        email: string;
    } | null;
}

export interface SuggestionListResponse {
    success: boolean;
    data: Suggestion[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        counts?: Record<string, number> & { total: number };
    };
}
