import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createSuggestion } from "@/api/suggestions";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import type { SuggestionType } from "@/types/suggestion";

const SUGGESTION_TYPES: { value: SuggestionType; label: string }[] = [
    { value: "BUG", label: "Bug" },
    { value: "SUGGESTION", label: "Sugerencia" },
    { value: "CONTENT_ERROR", label: "Error de contenido" },
    { value: "TECHNICAL_PROBLEM", label: "Problema técnico" },
    { value: "OTHER", label: "Otro" },
];

const TYPE_LABEL: Record<SuggestionType, string> = {
    BUG: "Bug",
    SUGGESTION: "Sugerencia",
    CONTENT_ERROR: "Error de contenido",
    TECHNICAL_PROBLEM: "Problema técnico",
    OTHER: "Otro",
};

interface Props {
    open: boolean;
    onClose: () => void;
}

export function SuggestionForm({ open, onClose }: Props) {
    const [type, setType] = useState<SuggestionType>("SUGGESTION");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [image, setImage] = useState("");
    const [confirming, setConfirming] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const handleRequestConfirm = (e: React.FormEvent) => {
        e.preventDefault();
        setConfirming(true);
    };

    const handleSend = async () => {
        setSending(true);
        setError(null);

        try {
            await createSuggestion({
                type,
                title: title.trim(),
                description: description.trim(),
                image: image.trim() || undefined,
            });
            setConfirming(false);
            setSent(true);
        } catch (err: unknown) {
            const msg =
                err && typeof err === "object" && "response" in err
                    ? String((err as { response: { data: { message: string } } }).response.data.message)
                    : "Error al enviar sugerencia";
            setError(msg);
            setConfirming(false);
        } finally {
            setSending(false);
        }
    };

    const handleClose = () => {
        setConfirming(false);
        setSent(false);
        setError(null);
        setType("SUGGESTION");
        setTitle("");
        setDescription("");
        setImage("");
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
            <DialogContent className="sm:max-w-[500px]">
                {sent ? (
                    <div className="flex flex-col items-center gap-4 py-8 text-center">
                        <CheckCircle2 className="size-14 text-emerald-500" />
                        <DialogHeader>
                            <DialogTitle>¡Gracias por tu aporte!</DialogTitle>
                            <DialogDescription>
                                Hemos recibido tu sugerencia correctamente. La revisaremos pronto.
                            </DialogDescription>
                        </DialogHeader>
                        <Button onClick={handleClose} className="mt-2">
                            Cerrar
                        </Button>
                    </div>
                ) : confirming ? (
                    <div className="py-4 space-y-5">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="size-6 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <DialogHeader className="p-0">
                                    <DialogTitle>¿Enviar sugerencia?</DialogTitle>
                                    <DialogDescription>
                                        Revisa los datos antes de enviar.
                                    </DialogDescription>
                                </DialogHeader>
                            </div>
                        </div>

                        <div className="space-y-3 bg-muted/50 rounded-xl p-4 text-sm">
                            <div>
                                <span className="text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">Tipo</span>
                                <p className="mt-0.5">{TYPE_LABEL[type]}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">Título</span>
                                <p className="mt-0.5 font-medium">{title}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">Descripción</span>
                                <p className="mt-0.5 whitespace-pre-wrap max-h-[200px] overflow-y-auto">{description}</p>
                            </div>
                            {image && (
                                <div>
                                    <span className="text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">Captura</span>
                                    <p className="mt-0.5 text-primary truncate">{image}</p>
                                </div>
                            )}
                        </div>

                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSend} disabled={sending}>
                                {sending ? "Enviando..." : "Sí, enviar"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Enviar sugerencia</DialogTitle>
                            <DialogDescription>
                                Reporta un bug, sugiere una mejora o comparte tu opinión.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleRequestConfirm} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="type">Tipo</Label>
                                <Select value={type} onValueChange={(v) => setType(v as SuggestionType)}>
                                    <SelectTrigger id="type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SUGGESTION_TYPES.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>
                                                {t.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="title">Título</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Resume tu sugerencia en pocas palabras"
                                    maxLength={200}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Descripción</Label>
                                <textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Explica con detalle tu sugerencia o el problema que encontraste"
                                    maxLength={5000}
                                    required
                                    className="flex h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y overflow-y-auto"
                                />
                                <p className="text-[11px] text-muted-foreground text-right">
                                    {description.length}/5000
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="image">
                                    Captura{" "}
                                    <span className="text-muted-foreground text-xs font-normal">
                                        (opcional)
                                    </span>
                                </Label>
                                <Input
                                    id="image"
                                    type="url"
                                    value={image}
                                    onChange={(e) => setImage(e.target.value)}
                                    placeholder="https://i.imgur.com/ejemplo.png"
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-destructive">{error}</p>
                            )}

                            <div className="flex justify-end gap-3">
                                <Button type="button" variant="outline" onClick={handleClose}>
                                    Cancelar
                                </Button>
                                <Button type="submit">
                                    Enviar sugerencia
                                </Button>
                            </div>
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
