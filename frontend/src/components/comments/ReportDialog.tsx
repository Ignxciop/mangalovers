import { useState } from "react";
import { createPortal } from "react-dom";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reportComment } from "@/api/comments";
import { toast } from "sonner";

const REASONS = [
    { value: "OFFENSIVE_LANGUAGE", label: "Lenguaje ofensivo" },
    { value: "UNMARKED_SPOILER", label: "Spoiler sin marcar" },
    { value: "OTHER", label: "Otro" },
] as const;

interface ReportDialogProps {
    commentId: number;
}

export function ReportDialog({ commentId }: ReportDialogProps) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState<string>("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit() {
        if (!reason) return;
        setLoading(true);
        try {
            await reportComment(commentId, reason, description || undefined);
            toast.success("Reporte enviado");
            setOpen(false);
            setReason("");
            setDescription("");
        } catch (err) {
            const msg = (err as any)?.response?.data?.message;
            toast.error(msg || "Error al enviar reporte");
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(true); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-amber-500 transition-colors"
                title="Reportar comentario"
            >
                <Flag className="h-3.5 w-3.5" />
            </button>

            {open && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center backdrop-brightness-[0.3]"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-5 py-4 border-b border-border">
                            <h3 className="text-sm font-semibold">Reportar comentario</h3>
                        </div>
                        <div className="px-5 py-4 space-y-4">
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Motivo</p>
                                {REASONS.map((r) => (
                                    <label
                                        key={r.value}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                                            reason === r.value
                                                ? "border-amber-500/50 bg-amber-500/10"
                                                : "border-border hover:bg-muted/40"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="reason"
                                            value={r.value}
                                            checked={reason === r.value}
                                            onChange={(e) => setReason(e.target.value)}
                                            className="accent-amber-500"
                                        />
                                        <span className="text-sm">{r.label}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Detalle <span className="text-muted-foreground/50">(opcional)</span>
                                </p>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Explica por qué reportas este comentario..."
                                    className="min-h-[72px] resize-none bg-white/5 border-white/10 text-sm"
                                    maxLength={500}
                                    disabled={loading}
                                />
                            </div>
                        </div>
                        <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setOpen(false)}
                                disabled={loading}
                            >
                                Cancelar
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSubmit}
                                disabled={!reason || loading}
                            >
                                {loading ? "Enviando..." : "Reportar"}
                            </Button>
                        </div>
                    </div>
                </div>
            , document.body)}
        </>
    );
}
