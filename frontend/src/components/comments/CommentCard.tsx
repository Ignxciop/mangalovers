import { useState } from "react";
import { toggleCommentLike, updateComment, deleteComment } from "@/api/comments";
import type { Comment } from "@/api/comments";
import { CommentForm } from "./CommentForm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/date";
import { Heart, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

interface CommentCardProps {
    comment: Comment;
    onLikeToggle: (commentId: number, liked: boolean) => void;
    onUpdate: (commentId: number, content: string) => void;
    onDelete: (commentId: number) => void;
    onReply: (parentId: number, content: string) => Promise<void>;
    depth: number;
}

export function CommentCard({
    comment,
    onLikeToggle,
    onUpdate,
    onDelete,
    onReply,
    depth,
}: CommentCardProps) {
    const currentUser = useAuthStore((s) => s.user);
    const isOwner = currentUser?.id === comment.user?.id;
    const isAdmin = currentUser?.role === "ADMIN";
    const canModify = isOwner || isAdmin;

    const [editing, setEditing] = useState(false);
    const [replying, setReplying] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [isLiked, setIsLiked] = useState(comment.isLikedByMe);
    const [likeCount, setLikeCount] = useState(comment.likeCount);

    async function handleLike() {
        const previousLiked = isLiked;
        setIsLiked(!isLiked);
        setLikeCount((c) => (isLiked ? c - 1 : c + 1));
        try {
            const { liked } = await toggleCommentLike(comment.id);
            setIsLiked(liked);
            setLikeCount((c) => (liked ? c : Math.max(0, c - 1)));
            onLikeToggle(comment.id, liked);
        } catch {
            setIsLiked(previousLiked);
            setLikeCount((c) => (previousLiked ? c + 1 : c - 1));
        }
    }

    async function handleUpdate(content: string) {
        const updated = await updateComment(comment.id, content);
        onUpdate(comment.id, updated.content);
        setEditing(false);
    }

    async function handleDelete() {
        if (!confirm("¿Eliminar comentario?")) return;
        setDeleting(true);
        try {
            await deleteComment(comment.id);
            onDelete(comment.id);
        } finally {
            setDeleting(false);
        }
    }

    async function handleReply(content: string) {
        await onReply(comment.id, content);
        setReplying(false);
    }

    const displayName = comment.user?.alias ?? "Anónimo";
    const initials = displayName.charAt(0).toUpperCase();

    if (deleting) return null;

    return (
        <div className={depth > 0 ? "ml-8 pl-4 border-l border-white/10" : ""}>
            <div className="flex gap-3 py-3">
                <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={comment.user?.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-xs bg-white/10">
                        {initials}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                            {displayName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {timeAgo(comment.createdAt)}
                        </span>
                    </div>

                    {editing ? (
                        <div className="mt-2">
                            <CommentForm
                                onSubmit={handleUpdate}
                                initialValue={comment.content}
                                onCancel={() => setEditing(false)}
                                submitLabel="Guardar"
                            />
                        </div>
                    ) : (
                        <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words">
                            {comment.content}
                        </p>
                    )}

                    {!editing && (
                        <div className="flex items-center gap-3 mt-2">
                            <button
                                onClick={handleLike}
                                className={`flex items-center gap-1 text-xs transition-colors ${
                                    isLiked
                                        ? "text-red-400"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <Heart
                                    className={`h-3.5 w-3.5 ${
                                        isLiked ? "fill-red-400" : ""
                                    }`}
                                />
                                {likeCount > 0 && likeCount}
                            </button>

                            <button
                                onClick={() => setReplying(!replying)}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <MessageCircle className="h-3.5 w-3.5" />
                                Responder
                            </button>

                            {canModify && (
                                <>
                                    <button
                                        onClick={() => setEditing(true)}
                                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {replying && (
                        <div className="mt-2">
                            <CommentForm
                                onSubmit={handleReply}
                                placeholder="Escribe una respuesta..."
                                onCancel={() => setReplying(false)}
                                submitLabel="Responder"
                            />
                        </div>
                    )}
                </div>
            </div>

            {comment.replies.length > 0 && (
                <div>
                    {comment.replies.map((reply) => (
                        <CommentCard
                            key={reply.id}
                            comment={reply}
                            onLikeToggle={onLikeToggle}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            onReply={onReply}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
