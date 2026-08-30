import { SEO } from "@/components/seo";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useChatSocket } from "@/hooks/useChatSocket";
import { fetchChatMessages, reportChatMessage } from "@/api/chat";
import type { ChatMessage, ChatReportReason } from "@/api/chat";
import { adminDeleteChatMessage, adminMuteChatUser } from "@/api/admin";
import { timeAgo } from "@/lib/date";
import { cn } from "@/lib/utils";
import {
    ArrowDown,
    Ban,
    Eye,
    EyeOff,
    Flag,
    Loader2,
    MessageSquare,
    MoreVertical,
    Send,
    ShieldCheck,
    Trash2,
} from "lucide-react";

const REPORT_REASONS: { value: ChatReportReason; label: string }[] = [
    { value: "OFFENSIVE_LANGUAGE", label: "Lenguaje ofensivo" },
    { value: "UNMARKED_SPOILER", label: "Spoiler sin marcar" },
    { value: "OTHER", label: "Otro motivo" },
];

const MUTE_DURATIONS: { value: string; label: string; minutes: number | null }[] = [
    { value: "permanent", label: "Permanente", minutes: null },
    { value: "30", label: "30 minutos", minutes: 30 },
    { value: "60", label: "1 hora", minutes: 60 },
    { value: "1440", label: "24 horas", minutes: 1440 },
    { value: "10080", label: "7 días", minutes: 10080 },
];

function errorMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string })?.message;
        if (msg) return msg;
    }
    return fallback;
}

export default function ChatPage() {
    const user = useAuthStore((s) => s.user);
    const isAdmin = user?.role === "ADMIN";
    const messages = useChatStore((s) => s.messages);
    const setMessages = useChatStore((s) => s.setMessages);
    const nextCursor = useChatStore((s) => s.nextCursor);
    const prependMessages = useChatStore((s) => s.prependMessages);
    const deletedIds = useChatStore((s) => s.deletedIds);
    const mutedUsers = useChatStore((s) => s.mutedUsers);
    const { sendMessage } = useChatSocket();
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [spoilerEnabled, setSpoilerEnabled] = useState(false);
    const [revealedSpoilers, setRevealedSpoilers] = useState<Set<number>>(new Set());
    const [newCount, setNewCount] = useState(0);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const stickToBottomRef = useRef(true);
    const loadingOlderRef = useRef(false);
    const prevMessagesRef = useRef(messages);
    const pendingScrollRestoreRef = useRef<{
        prevScrollHeight: number;
        prevScrollTop: number;
    } | null>(null);

    const [reportTarget, setReportTarget] = useState<ChatMessage | null>(null);
    const [reportReason, setReportReason] = useState<ChatReportReason>("OFFENSIVE_LANGUAGE");
    const [reportDescription, setReportDescription] = useState("");
    const [reporting, setReporting] = useState(false);

    const [muteTarget, setMuteTarget] = useState<ChatMessage | null>(null);
    const [muteDuration, setMuteDuration] = useState("permanent");
    const [muteReason, setMuteReason] = useState("");
    const [muting, setMuting] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
    const [deleting, setDeleting] = useState(false);

    const selfMute = user?.id ? mutedUsers[user.id] ?? null : null;

    useEffect(() => {
        fetchChatMessages()
            .then((data) => setMessages([...data.messages].reverse(), data.nextCursor))
            .catch(() => toast.error("Error al cargar el chat"))
            .finally(() => setLoading(false));
    }, [setMessages]);

    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        if (pendingScrollRestoreRef.current) {
            const { prevScrollHeight, prevScrollTop } = pendingScrollRestoreRef.current;
            pendingScrollRestoreRef.current = null;
            const delta = el.scrollHeight - prevScrollHeight;
            el.scrollTop = prevScrollTop + delta;
            stickToBottomRef.current =
                el.scrollHeight - el.scrollTop - el.clientHeight < 150;
            return;
        }

        const appended = messages !== prevMessagesRef.current;
        prevMessagesRef.current = messages;
        if (!appended) return;
        if (messages.length === 0) return;

        const lastMessage = messages[messages.length - 1];
        const isOwn = lastMessage.user?.id === user?.id;

        if (isOwn || stickToBottomRef.current) {
            el.scrollTop = el.scrollHeight;
            stickToBottomRef.current = true;
            setNewCount(0);
        } else {
            setNewCount((c) => c + 1);
        }
    }, [messages, user?.id]);

    const loadMoreOlder = async () => {
        if (nextCursor === null || loadingOlderRef.current) return;
        loadingOlderRef.current = true;
        setLoadingOlder(true);
        const el = scrollRef.current;
        const prevScrollHeight = el?.scrollHeight ?? 0;
        const prevScrollTop = el?.scrollTop ?? 0;
        try {
            const data = await fetchChatMessages(nextCursor);
            prependMessages([...data.messages].reverse(), data.nextCursor);
            pendingScrollRestoreRef.current = { prevScrollHeight, prevScrollTop };
        } catch {
            toast.error("No se pudieron cargar mensajes anteriores");
        } finally {
            loadingOlderRef.current = false;
            setLoadingOlder(false);
        }
    };

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
        stickToBottomRef.current = nearBottom;
        if (nearBottom) setNewCount(0);
        if (el.scrollTop <= 40) loadMoreOlder();
    };

    const jumpToBottom = () => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
        stickToBottomRef.current = true;
        setNewCount(0);
    };

    const revealSpoiler = (id: number) => {
        setRevealedSpoilers((s) => {
            if (s.has(id)) return s;
            const next = new Set(s);
            next.add(id);
            return next;
        });
    };

    const handleSend = async () => {
        const content = draft.trim();
        if (!content || sending) return;

        setSending(true);
        const result = await sendMessage(content, spoilerEnabled);
        setSending(false);

        if (result.ok) {
            setDraft("");
            setSpoilerEnabled(false);
        } else if (result.error === "INVALID_CONTENT") {
            toast.error("Mensaje inválido (máximo 300 caracteres)");
        } else if (result.error === "RATE_LIMITED") {
            toast.error("Estás enviando mensajes muy rápido", {
                description: "Espera unos segundos antes de enviar otro mensaje.",
            });
        } else if (result.error === "MUTED") {
            const description = result.mutedUntil
                ? `Silenciado hasta el ${new Date(result.mutedUntil).toLocaleString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                : "Silenciado permanentemente en el chat.";
            toast.error("Estás silenciado en el chat", { description });
        } else if (result.error === "DUPLICATE_MESSAGE") {
            toast.error("No puedes enviar el mismo mensaje dos veces seguidas");
        } else {
            toast.error("No se pudo enviar el mensaje");
        }
    };

    const handleSubmitReport = async () => {
        if (!reportTarget) return;
        setReporting(true);
        try {
            await reportChatMessage(
                reportTarget.id,
                reportReason,
                reportDescription.trim() || undefined,
            );
            toast.success("Reporte enviado", {
                description: "Un moderador revisará el mensaje.",
            });
            setReportTarget(null);
            setReportDescription("");
            setReportReason("OFFENSIVE_LANGUAGE");
        } catch (err) {
            toast.error(errorMessage(err, "No se pudo enviar el reporte"));
        } finally {
            setReporting(false);
        }
    };

    const handleSubmitMute = async () => {
        if (!muteTarget?.user) return;
        setMuting(true);
        try {
            const duration = MUTE_DURATIONS.find((d) => d.value === muteDuration)?.minutes ?? null;
            await adminMuteChatUser(
                muteTarget.user.id,
                duration,
                muteReason.trim() || undefined,
            );
            toast.success("Usuario silenciado", {
                description: `@${muteTarget.user.alias ?? "usuario"} no podrá enviar mensajes en el chat.`,
            });
            setMuteTarget(null);
            setMuteReason("");
            setMuteDuration("permanent");
        } catch (err) {
            toast.error(errorMessage(err, "No se pudo silenciar al usuario"));
        } finally {
            setMuting(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await adminDeleteChatMessage(deleteTarget.id);
            toast.success("Mensaje eliminado");
            setDeleteTarget(null);
        } catch (err) {
            toast.error(errorMessage(err, "No se pudo eliminar el mensaje"));
        } finally {
            setDeleting(false);
        }
    };

    const avatarUrl = (avatar: string | null | undefined) =>
        avatar
            ? `${import.meta.env.VITE_API_URL?.replace("/api", "") ?? ""}/uploads/avatars/${avatar}`
            : undefined;

    return (
        <>
            <SEO
                title="Chat global"
                description="Chatea en tiempo real con la comunidad de Mangalovers."
                canonicalPath="/chat"
            />
            <div className="bg-background min-h-full">
                <main className="w-full px-4 lg:px-6 py-8">
                    <div className="flex flex-col h-[calc(100dvh-7rem)] gap-3">
                        <div className="flex items-center gap-3 px-1.5">
                            <div className="flex items-center justify-center size-9 rounded-xl shrink-0 bg-gradient-to-br from-brand to-brand-cyan text-white shadow-sm">
                                <MessageSquare className="size-4" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-sm font-bold text-foreground truncate">
                                    Chat global
                                </h1>
                                <p className="text-xs text-muted-foreground truncate">
                                    Conversa en tiempo real con la comunidad
                                </p>
                            </div>
                        </div>

                        {selfMute && (
                            <div className="flex items-center gap-2 shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                                <Ban className="size-3.5 shrink-0" />
                                <span>
                                    Estás silenciado en el chat
                                    {selfMute.mutedUntil
                                        ? ` hasta el ${new Date(selfMute.mutedUntil).toLocaleString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}.`
                                        : " permanentemente."}
                                </span>
                            </div>
                        )}

                        <div className="relative flex-1 min-h-0">
                            <div
                                ref={scrollRef}
                                onScroll={handleScroll}
                                className="h-full overflow-y-auto rounded-xl border border-border bg-card/60 flex flex-col gap-3 p-4"
                                aria-live="polite"
                            >
                                {loadingOlder && (
                                    <div className="flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground shrink-0">
                                        <Loader2 className="size-3.5 animate-spin" />
                                        Cargando mensajes anteriores...
                                    </div>
                                )}
                                {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex items-start gap-3 animate-pulse">
                                        <div className="size-8 rounded-full bg-muted shrink-0" />
                                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                            <div className="h-3 w-24 rounded bg-muted" />
                                            <div className="h-3 w-3/4 rounded bg-muted" />
                                        </div>
                                    </div>
                                ))
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 flex-1 text-center">
                                    <MessageSquare className="size-7 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">
                                        Aún no hay mensajes. ¡Sé la primera persona en saludar!
                                    </p>
                                </div>
                            ) : (
                                messages.map((message) => {
                                    const mine = message.user?.id === user?.id;
                                    const deleted = deletedIds.includes(message.id);
                                    return (
                                        <div
                                            key={message.id}
                                            className={cn(
                                                "flex items-start gap-3 max-w-[85%] animate-fade-in-up",
                                                mine && "self-end flex-row-reverse",
                                            )}
                                        >
                                            <Avatar className="size-8 rounded-lg shrink-0">
                                                <AvatarImage
                                                    src={avatarUrl(message.user?.avatarUrl)}
                                                    alt={message.user?.alias ?? "Usuario"}
                                                    className="rounded-lg object-cover"
                                                />
                                                <AvatarFallback className="rounded-lg text-xs font-bold bg-primary/10 text-primary">
                                                    {message.user?.alias?.[0]?.toUpperCase() ?? "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div
                                                className={cn(
                                                    "flex flex-col gap-0.5 min-w-0",
                                                    mine && "items-end",
                                                )}
                                            >
                                                <div className="flex items-center gap-2 px-1">
                                                    <span className="text-xs font-semibold text-foreground truncate">
                                                        {mine ? "Tú" : (message.user?.alias ?? "Usuario")}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground/50 shrink-0">
                                                        {timeAgo(message.createdAt)}
                                                    </span>
                                                    {!mine && !deleted && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button
                                                                    type="button"
                                                                    aria-label="Opciones del mensaje"
                                                                    className="size-5 shrink-0 -mr-1 inline-flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                                >
                                                                    <MoreVertical className="size-3.5" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-56 rounded-xl">
                                                                <DropdownMenuItem
                                                                    onSelect={() => {
                                                                        setReportTarget(message);
                                                                        setReportReason("OFFENSIVE_LANGUAGE");
                                                                        setReportDescription("");
                                                                    }}
                                                                    className="cursor-pointer gap-2.5"
                                                                >
                                                                    <Flag className="size-4 text-muted-foreground" />
                                                                    <span>Reportar mensaje</span>
                                                                </DropdownMenuItem>
                                                                {isAdmin && (
                                                                    <>
                                                                        <DropdownMenuItem
                                                                            onSelect={() => setMuteTarget(message)}
                                                                            className="cursor-pointer gap-2.5"
                                                                        >
                                                                            <Ban className="size-4 text-muted-foreground" />
                                                                            <span>Silenciar usuario</span>
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            onSelect={() => setDeleteTarget(message)}
                                                                            className="cursor-pointer gap-2.5 text-rose-500 focus:text-rose-500 focus:bg-rose-500/10"
                                                                        >
                                                                            <Trash2 className="size-4" />
                                                                            <span>Eliminar mensaje</span>
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                                <div
                                                    className={cn(
                                                        "relative rounded-2xl px-3 py-2 text-sm leading-relaxed break-words max-w-full",
                                                        mine
                                                            ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-tr-sm"
                                                            : "bg-muted text-foreground rounded-bl-sm border border-border",
                                                        deleted && "bg-muted/50 border-dashed",
                                                    )}
                                                >
                                                    {deleted ? (
                                                        <span className="text-muted-foreground italic">
                                                            Mensaje eliminado por moderación
                                                        </span>
                                                    ) : message.isSpoiler &&
                                                      !revealedSpoilers.has(message.id) ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => revealSpoiler(message.id)}
                                                            className="block w-full text-left cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                                                            aria-label="Mensaje con spoiler. Hacer clic para revelar el contenido."
                                                        >
                                                            <span
                                                                className={cn(
                                                                    "block blur-sm",
                                                                    mine
                                                                        ? "text-primary-foreground"
                                                                        : "text-foreground",
                                                                )}
                                                            >
                                                                {message.content}
                                                            </span>
                                                            <span
                                                                className={cn(
                                                                    "absolute inset-0 flex items-center justify-center gap-1.5 text-xs font-medium italic",
                                                                    mine
                                                                        ? "text-primary-foreground/80"
                                                                        : "text-muted-foreground",
                                                                )}
                                                            >
                                                                <EyeOff className="size-3.5 shrink-0" />
                                                                Spoiler — clic para ver
                                                            </span>
                                                        </button>
                                                    ) : (
                                                        message.content
                                                    )}
                                                </div>
                                                {deleted && (
                                                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60 px-1">
                                                        <ShieldCheck className="size-3" />
                                                        Moderación
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            </div>
                            {newCount > 0 && (
                                <button
                                    type="button"
                                    onClick={jumpToBottom}
                                    aria-label={`Bajar y ver ${newCount} ${newCount === 1 ? "mensaje nuevo" : "mensajes nuevos"}`}
                                    className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                                >
                                    <ArrowDown className="size-3.5" />
                                    {newCount} {newCount === 1 ? "nuevo" : "nuevos"}
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2">
                            <button
                                type="button"
                                onClick={() => setSpoilerEnabled((v) => !v)}
                                disabled={!!selfMute}
                                aria-pressed={spoilerEnabled}
                                title={
                                    spoilerEnabled
                                        ? "Mensaje marcado como spoiler"
                                        : "Marcar mensaje como spoiler"
                                }
                                className={cn(
                                    "shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    spoilerEnabled
                                        ? "border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400"
                                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                                    selfMute && "opacity-50 cursor-not-allowed",
                                )}
                            >
                                {spoilerEnabled ? (
                                    <EyeOff className="size-3.5" />
                                ) : (
                                    <Eye className="size-3.5" />
                                )}
                                <span className="hidden sm:inline">Spoiler</span>
                            </button>
                            <input
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                maxLength={300}
                                placeholder={
                                    selfMute
                                        ? "Estás silenciado en el chat"
                                        : "Escribe un mensaje..."
                                }
                                aria-label="Mensaje"
                                disabled={!!selfMute}
                                className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none px-2 py-1.5 disabled:cursor-not-allowed"
                            />
                            <Button
                                size="sm"
                                onClick={handleSend}
                                disabled={!draft.trim() || sending || !!selfMute}
                                aria-label="Enviar mensaje"
                                className="shrink-0 gap-1.5"
                            >
                                <Send className="size-3.5" />
                                <span className="hidden sm:inline">Enviar</span>
                            </Button>
                        </div>
                    </div>
                </main>
            </div>

            <Dialog open={!!reportTarget} onOpenChange={(open) => !open && setReportTarget(null)}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Reportar mensaje</DialogTitle>
                        <DialogDescription className="break-words">
                            {reportTarget ? `"${reportTarget.content.slice(0, 120)}${reportTarget.content.length > 120 ? "…" : ""}"` : ""}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground">
                                Motivo
                            </span>
                            <Select
                                value={reportReason}
                                onValueChange={(v) => setReportReason(v as ChatReportReason)}
                            >
                                <SelectTrigger aria-label="Motivo del reporte">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {REPORT_REASONS.map((r) => (
                                        <SelectItem key={r.value} value={r.value}>
                                            {r.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground">
                                Descripción (opcional)
                            </span>
                            <Textarea
                                value={reportDescription}
                                onChange={(e) => setReportDescription(e.target.value)}
                                maxLength={500}
                                placeholder="Añade contexto para el moderador..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setReportTarget(null)}
                            disabled={reporting}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handleSubmitReport} disabled={reporting}>
                            {reporting ? "Enviando..." : "Enviar reporte"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!muteTarget} onOpenChange={(open) => !open && setMuteTarget(null)}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Silenciar usuario</DialogTitle>
                        <DialogDescription>
                            @{muteTarget?.user?.alias ?? "usuario"} no podrá enviar mensajes en el
                            chat global durante el período indicado.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground">
                                Duración
                            </span>
                            <Select value={muteDuration} onValueChange={setMuteDuration}>
                                <SelectTrigger aria-label="Duración del silencio">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MUTE_DURATIONS.map((d) => (
                                        <SelectItem key={d.value} value={d.value}>
                                            {d.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground">
                                Motivo (opcional)
                            </span>
                            <Input
                                value={muteReason}
                                onChange={(e) => setMuteReason(e.target.value)}
                                maxLength={300}
                                placeholder="Motivo del silencio..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setMuteTarget(null)}
                            disabled={muting}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handleSubmitMute} disabled={muting}>
                            {muting ? "Silenciando..." : "Silenciar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Eliminar mensaje</DialogTitle>
                        <DialogDescription className="break-words">
                            {deleteTarget
                                ? `"${deleteTarget.content.slice(0, 120)}${deleteTarget.content.length > 120 ? "…" : ""}"`
                                : ""}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-col gap-2">
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={deleting}
                            className="w-full"
                        >
                            {deleting ? "Eliminando..." : "Sí, eliminar mensaje"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                            disabled={deleting}
                            className="w-full"
                        >
                            Cancelar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}