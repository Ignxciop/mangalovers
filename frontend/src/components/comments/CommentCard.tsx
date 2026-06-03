import { useState } from "react";
import { toggleCommentLike, updateComment, deleteComment } from "@/api/comments";
import type { Comment } from "@/api/comments";
import { CommentForm } from "./CommentForm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/date";
import { Heart, MessageCircle, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

interface CommentCardProps {
    comment: Comment;
    onLikeToggle: (commentId: number, liked: boolean) => void;
    onUpdate: (commentId: number, content: string) => void;
    onDelete: (commentId: number) => void;
    onReply: (parentId: number, content: string, isSpoiler?: boolean) => Promise<void>;
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

    const [editing, setEditing] = useState(false);
    const [replying, setReplying] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [isLiked, setIsLiked] = useState(comment.isLikedByMe);
    const [likeCount, setLikeCount] = useState(comment.likeCount);
    const [revealSpoiler, setRevealSpoiler] = useState(false);

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

    async function handleUpdate(content: string, isSpoiler?: boolean) {
        const updated = await updateComment(comment.id, content, isSpoiler);
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

    async function handleReply(content: string, isSpoiler?: boolean) {
        await onReply(comment.id, content, isSpoiler);
        setReplying(false);
    }

    const displayName = comment.user?.alias ?? "Anónimo";
    const initials = displayName.charAt(0).toUpperCase();

    if (deleting) return null;

    return (
        <div id={`comment-${comment.id}`} className={depth === 1 ? "ml-8 pl-4 border-l border-white/10" : ""}>
            <div className="flex gap-3 py-3">
                <Avatar className="h-8 w-8 shrink-0">
                    {comment.user?.avatarUrl && (
                        <AvatarImage
                            src={`${import.meta.env.VITE_API_URL?.replace("/api", "") ?? ""}/uploads/avatars/${comment.user.avatarUrl}`}
                        />
                    )}
                    <AvatarFallback className="text-xs bg-white/10">
                        {initials}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                            {displayName}
                        </span>
                        {comment.isSpoiler && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">
                                <AlertTriangle className="h-3 w-3" />
                                Spoiler
                            </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                            {timeAgo(comment.createdAt)}
                        </span>
                    </div>

                    {editing ? (
                        <div className="mt-2">
                            <CommentForm
                                onSubmit={handleUpdate}
                                initialValue={comment.content}
                                initialSpoiler={comment.isSpoiler}
                                onCancel={() => setEditing(false)}
                                submitLabel="Guardar"
                                showSpoiler={true}
                            />
                        </div>
                    ) : (
                        <div className="mt-1 relative">
                            {comment.isSpoiler && !revealSpoiler ? (
                                <div
                                    onClick={() => setRevealSpoiler(true)}
                                    className="cursor-pointer select-none"
                                >
                                    <p className="text-sm text-foreground/40 mt-1 whitespace-pre-wrap break-words blur-sm select-none">
                                        {comment.content}
                                    </p>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xs text-orange-400 bg-background/80 px-3 py-1 rounded-full border border-orange-400/30">
                                            Click para revelar spoiler
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words">
                                    {comment.content}
                                </p>
                            )}
                        </div>
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

                            {isOwner && (
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
                            {isAdmin && !isOwner && (
                                <button
                                    onClick={handleDelete}
                                    className="ml-auto flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-md px-2.5 py-1 transition-colors"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Eliminar
                                </button>
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
