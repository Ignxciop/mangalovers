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
    user: CommentUser | null;
    likeCount: number;
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
