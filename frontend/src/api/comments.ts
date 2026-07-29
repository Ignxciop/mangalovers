import { api } from "./axios";

export interface CommentUser {
    id: string;
    alias: string | null;
    avatarUrl: string | null;
}

export interface Comment {
    id: number;
    content: string;
    isSpoiler: boolean;
    parentId: number | null;
    createdAt: string;
    updatedAt: string;
    isEdited: boolean;
    user: CommentUser | null;
    likeCount: number;
    replyCount: number;
    isLikedByMe: boolean;
    replies: Comment[];
}

export interface ChapterCommentsResponse {
    success: boolean;
    data: Comment[];
    total: number;
    page: number;
    limit: number;
}

export async function getChapterComments(
    chapterId: number,
    page = 1,
    limit = 20,
): Promise<ChapterCommentsResponse> {
    const { data } = await api.get<ChapterCommentsResponse>(
        `/comments/chapter/${chapterId}`,
        { params: { page, limit } },
    );
    return data;
}

export async function createComment(
    chapterId: number,
    content: string,
    isSpoiler = false,
): Promise<Comment> {
    const { data } = await api.post<{ success: boolean; data: Comment }>(
        `/comments/chapter/${chapterId}`,
        { content, isSpoiler },
    );
    return data.data;
}

export type SeriesCommentsResponse = ChapterCommentsResponse;

export async function getSeriesComments(
    seriesId: number,
    page = 1,
    limit = 20,
): Promise<SeriesCommentsResponse> {
    const { data } = await api.get<SeriesCommentsResponse>(
        `/comments/series/${seriesId}`,
        { params: { page, limit } },
    );
    return data;
}

export async function createSeriesComment(
    seriesId: number,
    content: string,
    isSpoiler = false,
): Promise<Comment> {
    const { data } = await api.post<{ success: boolean; data: Comment }>(
        `/comments/series/${seriesId}`,
        { content, isSpoiler },
    );
    return data.data;
}

export async function getCommentReplies(
    commentId: number,
    offset = 0,
    limit = 5,
): Promise<ChapterCommentsResponse> {
    const { data } = await api.get<ChapterCommentsResponse>(
        `/comments/${commentId}/replies`,
        { params: { offset, limit } },
    );
    return data;
}

export async function replyToComment(
    commentId: number,
    content: string,
    isSpoiler = false,
): Promise<Comment> {
    const { data } = await api.post<{ success: boolean; data: Comment }>(
        `/comments/${commentId}/reply`,
        { content, isSpoiler },
    );
    return data.data;
}

export async function updateComment(
    commentId: number,
    content: string,
    isSpoiler?: boolean,
): Promise<Comment> {
    const body: Record<string, unknown> = { content };
    if (isSpoiler !== undefined) body.isSpoiler = isSpoiler;
    const { data } = await api.patch<{ success: boolean; data: Comment }>(
        `/comments/${commentId}`,
        body,
    );
    return data.data;
}

export async function deleteComment(commentId: number): Promise<void> {
    await api.delete(`/comments/${commentId}`);
}

export async function toggleCommentLike(
    commentId: number,
): Promise<{ liked: boolean }> {
    const { data } = await api.post<{ success: boolean; liked: boolean }>(
        `/comments/${commentId}/like`,
    );
    return { liked: data.liked };
}

export async function reportComment(
    commentId: number,
    reason: string,
    description?: string,
): Promise<void> {
    await api.post(`/comments/${commentId}/report`, { reason, description });
}
