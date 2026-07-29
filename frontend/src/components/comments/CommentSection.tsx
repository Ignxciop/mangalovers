import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
    getChapterComments,
    getSeriesComments,
    getCommentReplies,
    createComment,
    createSeriesComment,
    replyToComment,
} from "@/api/comments";
import type { Comment } from "@/api/comments";
import { CommentCard } from "./CommentCard";
import { CommentForm } from "./CommentForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";
import { MessageSquare } from "lucide-react";

interface CommentSectionProps {
    context: "chapter" | "series";
    id: number;
}

export function CommentSection({ context, id }: CommentSectionProps) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    const [comments, setComments] = useState<Comment[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchComments = useCallback(async (pageNum: number) => {
        const res = context === "chapter"
            ? await getChapterComments(id, pageNum, 10)
            : await getSeriesComments(id, pageNum, 10);
        return res;
    }, [context, id]);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetchComments(1)
            .then((res) => {
                setComments(res.data);
                setTotal(res.total);
                setPage(1);
            })
            .catch(() => setError("Error al cargar comentarios"))
            .finally(() => setLoading(false));
    }, [fetchComments]);

    const location = useLocation();
    const hashScrolled = useRef(false);

    useEffect(() => {
        if (!loading && location.hash && !hashScrolled.current) {
            const id = location.hash.replace("#", "");
            const el = document.getElementById(id);
            if (!el) return;

            hashScrolled.current = true;
            const target = el;

            function scrollToEl() {
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            }

            scrollToEl();
            target.classList.add("ring-2", "ring-orange-500/50", "rounded-lg", "transition-all", "duration-700");

            let rafId: number;
            const observer = new ResizeObserver(() => {
                cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(scrollToEl);
            });
            observer.observe(document.body);

            const cleanup = setTimeout(() => {
                observer.disconnect();
                cancelAnimationFrame(rafId);
                target.classList.remove("ring-2", "ring-orange-500/50");
            }, 6000);

            return () => {
                observer.disconnect();
                clearTimeout(cleanup);
                cancelAnimationFrame(rafId);
            };
        }
    }, [loading, location.hash]);

    async function handleLoadMore() {
        const nextPage = page + 1;
        setLoadingMore(true);
        try {
            const res = await fetchComments(nextPage);
            setComments((prev) => [...prev, ...res.data]);
            setTotal(res.total);
            setPage(nextPage);
        } catch {
            setError("Error al cargar más comentarios");
        } finally {
            setLoadingMore(false);
        }
    }

    async function handleLoadMoreReplies(commentId: number) {
        const parent = findInTree(comments, commentId);
        if (!parent) return;
        const offset = parent.replies.length;
        try {
            const res = await getCommentReplies(commentId, offset, 5);
            setComments((prev) => {
                const updated = appendRepliesToTree(prev, commentId, res.data);
                return updateInTree(updated, commentId, (c) => ({
                    ...c,
                    replyCount: res.total,
                    totalReplyCount: res.total + res.data.reduce(
                        (sum, child) => sum + child.totalReplyCount - child.replyCount,
                        0,
                    ),
                }));
            });
        } catch {
            // silenciar
        }
    }

    async function handleCreateComment(content: string, isSpoiler: boolean) {
        const newComment = context === "chapter"
            ? await createComment(id, content, isSpoiler)
            : await createSeriesComment(id, content, isSpoiler);
        setComments((prev) => [newComment, ...prev]);
        setTotal((t) => t + 1);
    }

    async function handleReply(parentId: number, content: string, isSpoiler?: boolean) {
        const reply = await replyToComment(parentId, content, isSpoiler);
        setComments((prev) => {
            const parentMap = buildParentMap(prev);
            let updated = addReplyToTree(prev, parentId, reply);
            let current = parentId;
            while (parentMap.has(current)) {
                const ancestorId = parentMap.get(current)!;
                updated = updateInTree(updated, ancestorId, (c) => ({
                    ...c,
                    replyCount: c.replyCount + 1,
                    totalReplyCount: c.totalReplyCount + 1,
                }));
                current = ancestorId;
            }
            return updated;
        });
    }

    function handleLikeToggle(commentId: number, liked: boolean) {
        setComments((prev) => updateInTree(prev, commentId, (c) => ({
            ...c,
            isLikedByMe: liked,
            likeCount: liked ? c.likeCount + 1 : Math.max(0, c.likeCount - 1),
        })));
    }

    function handleUpdate(commentId: number, content: string) {
        setComments((prev) => updateInTree(prev, commentId, (c) => ({
            ...c,
            content,
        })));
    }

    function handleDelete(commentId: number) {
        setComments((prev) => {
            const deleted = findInTree(prev, commentId);
            if (!deleted || !deleted.parentId) return removeFromTree(prev, commentId);
            const parentMap = buildParentMap(prev);
            const dec = 1 + countDescendants(deleted);
            let updated = removeFromTree(prev, commentId);
            let current = deleted.parentId;
            while (parentMap.has(current)) {
                const ancestorId = parentMap.get(current)!;
                updated = updateInTree(updated, ancestorId, (c) => ({
                    ...c,
                    replyCount: c.replyCount - 1,
                    totalReplyCount: c.totalReplyCount - dec,
                }));
                current = ancestorId;
            }
            return updated;
        });
        setTotal((t) => t - 1);
    }

    if (loading) {
        return (
            <div className="space-y-4 py-6">
                <Skeleton className="h-5 w-40" />
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-6 text-muted-foreground text-sm">
                {error}
            </div>
        );
    }

    return (
        <div className="py-6">
            <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">
                    Comentarios
                </h3>
                <span className="text-sm text-muted-foreground">
                    ({total})
                </span>
            </div>

            {isAuthenticated ? (
                <div className="mb-6">
                    <CommentForm
                        onSubmit={handleCreateComment}
                        placeholder="Escribe un comentario..."
                    />
                </div>
            ) : (
                <div className="mb-6 text-center text-sm text-muted-foreground py-4 border border-dashed border-white/10 rounded-lg">
                    Inicia sesión para comentar
                </div>
            )}

            {comments.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                    No hay comentarios aún. ¡Sé el primero en comentar!
                </div>
            ) : (
                <div>
                    {comments.map((comment) => (
                        <CommentCard
                            key={comment.id}
                            comment={comment}
                            onLikeToggle={handleLikeToggle}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                            onReply={handleReply}
                            onLoadMoreReplies={handleLoadMoreReplies}
                            depth={0}
                        />
                    ))}

                    {comments.length < total && (
                        <div className="text-center pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                            >
                                {loadingMore
                                    ? "Cargando..."
                                    : `Cargar más comentarios (${comments.length}/${total})`}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function findInTree(comments: Comment[], commentId: number): Comment | undefined {
    for (const c of comments) {
        if (c.id === commentId) return c;
        const found = findInTree(c.replies, commentId);
        if (found) return found;
    }
    return undefined;
}

function addReplyToTree(
    comments: Comment[],
    parentId: number,
    reply: Comment,
): Comment[] {
    return comments.map((c) => {
        if (c.id === parentId) {
            return {
                ...c,
                replyCount: c.replyCount + 1,
                totalReplyCount: c.totalReplyCount + 1,
                replies: [...c.replies, reply],
            };
        }
        return { ...c, replies: addReplyToTree(c.replies, parentId, reply) };
    });
}

function updateInTree(
    comments: Comment[],
    commentId: number,
    updater: (c: Comment) => Comment,
): Comment[] {
    return comments.map((c) => {
        if (c.id === commentId) return updater(c);
        return { ...c, replies: updateInTree(c.replies, commentId, updater) };
    });
}

function removeFromTree(comments: Comment[], commentId: number): Comment[] {
    return comments
        .filter((c) => c.id !== commentId)
        .map((c) => ({
            ...c,
            replies: removeFromTree(c.replies, commentId),
        }));
}

function appendRepliesToTree(
    comments: Comment[],
    parentId: number,
    newReplies: Comment[],
): Comment[] {
    return comments.map((c) => {
        if (c.id === parentId) {
            const existingIds = new Set(c.replies.map((r) => r.id));
            const unique = newReplies.filter((r) => !existingIds.has(r.id));
            return { ...c, replies: [...c.replies, ...unique] };
        }
        return { ...c, replies: appendRepliesToTree(c.replies, parentId, newReplies) };
    });
}

function buildParentMap(comments: Comment[]): Map<number, number> {
    const map = new Map<number, number>();
    function walk(list: Comment[]) {
        for (const c of list) {
            if (c.parentId) map.set(c.id, c.parentId);
            walk(c.replies);
        }
    }
    walk(comments);
    return map;
}

function countDescendants(comment: Comment): number {
    let count = 0;
    for (const r of comment.replies) {
        count += 1 + countDescendants(r);
    }
    return count;
}
