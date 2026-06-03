import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CommentFormProps {
    onSubmit: (content: string) => Promise<void>;
    placeholder?: string;
    initialValue?: string;
    onCancel?: () => void;
    submitLabel?: string;
}

export function CommentForm({
    onSubmit,
    placeholder = "Escribe un comentario...",
    initialValue = "",
    onCancel,
    submitLabel = "Enviar",
}: CommentFormProps) {
    const [content, setContent] = useState(initialValue);
    const [loading, setLoading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = content.trim();
        if (!trimmed) return;

        setLoading(true);
        try {
            await onSubmit(trimmed);
            setContent("");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                className="min-h-[72px] resize-none bg-white/5 border-white/10 text-sm"
                maxLength={1000}
                disabled={loading}
            />
            <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                    {content.length}/1000
                </span>
                <div className="flex items-center gap-2">
                    {onCancel && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onCancel}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                    )}
                    <Button
                        type="submit"
                        size="sm"
                        disabled={!content.trim() || loading}
                    >
                        {loading ? "Enviando..." : submitLabel}
                    </Button>
                </div>
            </div>
        </form>
    );
}
