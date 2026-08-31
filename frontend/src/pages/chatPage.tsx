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
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useFriendStore } from "@/store/friendStore";
import { useChatSocket } from "@/hooks/useChatSocket";
import { fetchChatMessages, reportChatMessage } from "@/api/chat";
import type { ChatMessage, ChatReportReason } from "@/api/chat";
import { getFriends, type Friend } from "@/api/friends";
import { adminDeleteChatMessage, adminMuteChatUser } from "@/api/admin";
import { timeAgo } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import {
    ArrowDown,
    Ban,
    BookOpen,
    Compass,
    Eye,
    EyeOff,
    Flag,
    Heart,
    HeartHandshake,
    Loader2,
    MessageSquare,
    MoreVertical,
    Send,
    ShieldCheck,
    Trash2,
    Users,
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

const AVATAR_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "";

const CHAT_RULES = [
    "Sé respetuoso: no insultes, acoses ni discrimines.",
    "Marca como spoiler cualquier contenido que revele la trama.",
    "Evita el spam y los mensajes repetidos en cadena.",
    "No compartas enlaces maliciosos ni contenido ilegal.",
    "Máximo 300 caracteres por mensaje.",
];

const MAX_OFFLINE_VISIBLE = 4;

function friendAvatarUrl(avatar: string | null | undefined): string | undefined {
    if (!avatar) return undefined;
    return `${AVATAR_BASE}/uploads/avatars/${avatar}`;
}

function FriendRow({ friend, online }: { friend: Friend; online: boolean }) {
    const inner = (
        <>
            <div className="relative shrink-0">
                <Avatar className="size-8 rounded-lg">
                    <AvatarImage
                        src={friendAvatarUrl(friend.avatarUrl)}
                        alt={friend.name}
                        className="rounded-lg object-cover"
                    />
                    <AvatarFallback className="rounded-lg text-xs font-bold bg-primary/10 text-primary">
                        {friend.name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                </Avatar>
                {online && (
                    <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 border-2 border-background shadow-[0_0_6px_-1px] shadow-emerald-400" />
                )}
            </div>
            <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-sm font-medium truncate text-foreground">
                    {friend.name} {friend.lastname}
                </span>
                {friend.alias ? (
                    <span className="text-xs text-muted-foreground/70 truncate">
                        @{friend.alias}
                    </span>
                ) : null}
            </div>
        </>
    );

    return friend.alias ? (
        <Link
            to={`/usuario/${friend.alias}`}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors hover:bg-muted/60"
        >
            {inner}
        </Link>
    ) : (
        <div className="flex items-center gap-2.5 px-2 py-1.5">{inner}</div>
    );
}

function FriendsOnlinePanel() {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);
    const [showOffline, setShowOffline] = useState(false);
    const onlineUserIds = useFriendStore((s) => s.onlineUserIds);

    useEffect(() => {
        getFriends()
            .then(setFriends)
            .catch(() => toast.error("No se pudieron cargar tus amigos"))
            .finally(() => setLoading(false));
    }, []);

    const online = friends.filter((f) => onlineUserIds.includes(f.id));
    const offline = friends.filter((f) => !onlineUserIds.includes(f.id));
    const visibleOffline = showOffline
        ? offline
        : offline.slice(0, MAX_OFFLINE_VISIBLE);

    return (
        <div className="flex flex-col min-h-0 overflow-hidden rounded-xl border border-border bg-card/60">
            <div className="shrink-0 flex items-center gap-2 border-b border-border px-3 py-2.5">
                <HeartHandshake className="size-4 text-brand shrink-0" />
                <h2 className="text-xs font-bold uppercase tracking-wide text-foreground">
                    Mis amigos
                </h2>
                {!loading && friends.length > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground/70 tabular-nums shrink-0">
                        {online.length}/{friends.length} en línea
                    </span>
                )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-1.5">
                {loading ? (
                    <div className="flex flex-col gap-1">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
                                <Skeleton className="size-8 rounded-lg shrink-0" />
                                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                    <Skeleton className="h-3.5 w-24" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : friends.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
                        <Users className="size-6 text-muted-foreground/40" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Aún no tienes amigos. Envía solicitudes para ver quién está en línea.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-0.5">
                        <p className="px-2 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600/80 dark:text-emerald-400/80">
                            En línea
                        </p>
                        {online.length === 0 ? (
                            <p className="px-2 py-1.5 text-xs text-muted-foreground">
                                Nadie en línea en este momento.
                            </p>
                        ) : (
                            online.map((f) => <FriendRow key={f.id} friend={f} online />)
                        )}

                        {offline.length > 0 && (
                            <>
                                <p className="px-2 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                                    Desconectados
                                </p>
                                {visibleOffline.map((f) => (
                                    <FriendRow key={f.id} friend={f} online={false} />
                                ))}
                                {offline.length > MAX_OFFLINE_VISIBLE && (
                                    <button
                                        type="button"
                                        onClick={() => setShowOffline((v) => !v)}
                                        className="px-2 py-1.5 text-left text-xs font-medium text-brand hover:text-brand/80 transition-colors"
                                    >
                                        {showOffline
                                            ? "Ver menos"
                                            : `Ver todos (${offline.length})`}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function ChatSidePanel() {
    const onlineCount = useChatStore((s) => s.onlineCount);

    return (
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-4">
                <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-500/10 shrink-0">
                    <span className="relative flex size-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                    </span>
                </div>
                <div className="min-w-0">
                    <p className="text-xl font-bold leading-none text-foreground tabular-nums">
                        {onlineCount}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        personas conectadas ahora
                    </p>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card/60 p-4">
                <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-foreground">
                    <ShieldCheck className="size-4 text-brand shrink-0" />
                    Reglas del chat
                </h2>
                <ul className="flex flex-col gap-2.5">
                    {CHAT_RULES.map((rule) => (
                        <li
                            key={rule}
                            className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
                        >
                            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand/70" />
                            {rule}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="rounded-xl border border-border bg-card/60 p-4">
                <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-foreground">
                    <Compass className="size-4 text-brand shrink-0" />
                    Explora
                </h2>
                <div className="flex flex-col gap-2">
                    <Button asChild variant="outline" className="w-full justify-start gap-2">
                        <Link to="/mangas">
                            <BookOpen className="size-4" />
                            Explorar mangas
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full justify-start gap-2">
                        <Link to="/favoritos">
                            <Heart className="size-4" />
                            Mis favoritos
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
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
    const onlineCount = useChatStore((s) => s.onlineCount);
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
            <div className="bg-background flex h-[calc(100svh-4rem)] flex-col overflow-hidden">
                <main className="h-full w-full px-4 lg:px-6 py-8">
                    <div className="flex h-full min-h-0 flex-col gap-3">
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
                            <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                🟢 {onlineCount} conectados
                            </span>
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

                        <div className="grid flex-1 min-h-0 gap-3 grid-cols-1 lg:grid-cols-[224px_minmax(0,1fr)] xl:grid-cols-[224px_minmax(0,1fr)_256px] w-full max-w-6xl mx-auto">
                            <aside className="hidden lg:flex flex-col min-h-0">
                                <FriendsOnlinePanel />
                            </aside>

                            <section className="relative min-w-0 flex flex-col min-h-0 gap-3 w-full max-w-2xl justify-self-center">
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
                                                        message.isSpoiler &&
                                                            !revealedSpoilers.has(message.id) &&
                                                            "min-w-[10rem]",
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
                                                                    "absolute inset-0 flex items-center justify-center gap-1.5 text-xs font-medium italic whitespace-nowrap",
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
                            </section>

                            <aside className="hidden xl:flex flex-col min-h-0">
                                <ChatSidePanel />
                            </aside>
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