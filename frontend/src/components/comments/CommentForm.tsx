import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

interface CommentFormProps {
    onSubmit: (content: string, isSpoiler: boolean) => Promise<void>;
    placeholder?: string;
    initialValue?: string;
    initialSpoiler?: boolean;
    onCancel?: () => void;
    submitLabel?: string;
    showSpoiler?: boolean;
}

export function CommentForm({
    onSubmit,
    placeholder = "Escribe un comentario...",
    initialValue = "",
    initialSpoiler = false,
    onCancel,
    submitLabel = "Enviar",
    showSpoiler = true,
}: CommentFormProps) {
    const [content, setContent] = useState(initialValue);
    const [isSpoiler, setIsSpoiler] = useState(initialSpoiler);
    const [loading, setLoading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = content.trim();
        if (!trimmed) return;

        setLoading(true);
        try {
            await onSubmit(trimmed, isSpoiler);
            setContent("");
            setIsSpoiler(false);
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
                {showSpoiler && (
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={isSpoiler}
                            onChange={(e) => setIsSpoiler(e.target.checked)}
                            className="accent-orange-500"
                            disabled={loading}
                        />
                        <AlertTriangle className="h-3 w-3 text-orange-400" />
                        Spoiler
                    </label>
                )}
                <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-muted-foreground">
                        {content.length}/1000
                    </span>
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
