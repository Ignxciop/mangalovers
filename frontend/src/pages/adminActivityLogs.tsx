import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getActivityLogs } from "@/api/admin";
import type { ActivityLogEntry } from "@/types/admin";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MangaPagination } from "@/components/MangaPagination";
import { FilterDrawer } from "@/components/FilterDrawer";
import { SEO } from "@/components/seo";
import { AdminHeader } from "@/components/AdminHeader";
import { cn } from "@/lib/utils";
import {
    ScrollText,
} from "lucide-react";

const AVATAR_API = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "";

const EVENT_LABELS: Record<string, string> = {
    REGISTER: "Crear cuenta",
    LOGIN: "Iniciar sesión",
    LOGOUT: "Cerrar sesión",
    ADD_FAVORITE: "Añadir favorito",
    REMOVE_FAVORITE: "Quitar favorito",
    MARK_READ: "Marcar leído",
    SEND_SUGGESTION: "Enviar sugerencia",
    UPDATE_SUGGESTION_STATUS: "Actualizar sugerencia",
    UPDATE_ROLE: "Cambiar rol",
    UPDATE_USER_STATUS: "Cambiar estado",
    API_ERROR: "Error de API",
    RATE_LIMIT: "Límite excedido",
    UPDATE_PROFILE: "Actualizar perfil",
    SEND_FRIEND_REQUEST: "Enviar solicitud",
    ACCEPT_FRIEND: "Aceptar solicitud",
    REJECT_FRIEND: "Rechazar solicitud",
    BLOCK_USER: "Bloquear usuario",
    UNBLOCK_USER: "Desbloquear usuario",
    CREATE_COMMENT: "Crear comentario",
    DELETE_COMMENT: "Eliminar comentario",
    REPORT_COMMENT: "Reportar comentario",
    DELETE_CHAT_MESSAGE: "Eliminar mensaje del chat",
    REPORT_CHAT_MESSAGE: "Reportar mensaje del chat",
    MUTE_CHAT_USER: "Silenciar usuario",
    UNMUTE_CHAT_USER: "Desilenciar usuario",
};

const EVENT_COLORS: Record<string, string> = {
    REGISTER: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    LOGIN: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    LOGOUT: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    ADD_FAVORITE: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    REMOVE_FAVORITE: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    MARK_READ: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    SEND_SUGGESTION: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    UPDATE_SUGGESTION_STATUS: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    UPDATE_ROLE: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    UPDATE_USER_STATUS: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    API_ERROR: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    RATE_LIMIT: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    UPDATE_PROFILE: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    SEND_FRIEND_REQUEST: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    ACCEPT_FRIEND: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    REJECT_FRIEND: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    BLOCK_USER: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    UNBLOCK_USER: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    CREATE_COMMENT: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    DELETE_COMMENT: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    REPORT_COMMENT: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    DELETE_CHAT_MESSAGE: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    REPORT_CHAT_MESSAGE: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    MUTE_CHAT_USER: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    UNMUTE_CHAT_USER: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

function formatDateTime(iso: string) {
    return new Date(iso).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function EventBadge({ event }: { event: string }) {
    return (
        <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border",
            EVENT_COLORS[event] ?? "bg-muted text-muted-foreground border-border",
        )}>
            {EVENT_LABELS[event] ?? event}
        </span>
    );
}

const REPORT_REASON_LABELS: Record<string, string> = {
    OFFENSIVE_LANGUAGE: "lenguaje ofensivo",
    UNMARKED_SPOILER: "spoiler sin marcar",
    OTHER: "otro",
};

const ROLE_LABELS: Record<string, string> = { ADMIN: "admin", USER: "usuario" };
const USER_STATUS_LABELS: Record<string, string> = { ACTIVE: "activo", BANNED: "baneado", SUSPENDED: "suspendido" };
const SUGGESTION_STATUS_LABELS: Record<string, string> = {
    OPEN: "abierta", REVIEWING: "revisando", RESOLVED: "resuelta", REJECTED: "rechazada", CLOSED: "cerrada",
};

function formatMetadata(event: string, metadata: Record<string, unknown> | null): string {
    if (!metadata) return "";
    switch (event) {
        case "REGISTER":
            return `Se registró con ${metadata.email}`;
        case "LOGIN": {
            const parts = [`Inició sesión con ${metadata.email}`];
            if (metadata.provider) parts.push(`(proveedor: ${metadata.provider})`);
            return parts.join(" ");
        }
        case "LOGOUT":
            return metadata.allSessions ? "Cerró sesión en todos los dispositivos" : "Cerró sesión";
        case "ADD_FAVORITE":
            return `Añadió "${metadata.seriesName}" a favoritos`;
        case "REMOVE_FAVORITE":
            return `Quitó "${metadata.seriesName}" de favoritos`;
        case "MARK_READ":
            return `Leyó "${metadata.chapterName}" de "${metadata.seriesName}"`;
        case "SEND_SUGGESTION":
            return `Envió sugerencia: "${metadata.title}"`;
        case "UPDATE_SUGGESTION_STATUS":
            return `"${metadata.title}" cambió de ${SUGGESTION_STATUS_LABELS[String(metadata.oldStatus)] ?? metadata.oldStatus} a ${SUGGESTION_STATUS_LABELS[String(metadata.newStatus)] ?? metadata.newStatus}`;
        case "UPDATE_ROLE":
            return `${metadata.targetUserName} pasó de ${ROLE_LABELS[String(metadata.oldRole)] ?? metadata.oldRole} a ${ROLE_LABELS[String(metadata.newRole)] ?? metadata.newRole}`;
        case "UPDATE_USER_STATUS": {
            let text = `${metadata.targetUserName} pasó de ${USER_STATUS_LABELS[String(metadata.oldStatus)] ?? metadata.oldStatus} a ${USER_STATUS_LABELS[String(metadata.newStatus)] ?? metadata.newStatus}`;
            if (metadata.suspendedUntil) {
                text += ` hasta el ${new Date(String(metadata.suspendedUntil)).toLocaleString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;
            }
            return text;
        }
        case "API_ERROR":
            return `Error ${metadata.statusCode} en ${metadata.method} ${metadata.route}${metadata.message ? `: ${metadata.message}` : ""}`;
        case "RATE_LIMIT":
            return `Límite excedido en ${metadata.method} ${metadata.route}`;
        case "SEND_FRIEND_REQUEST":
            return "Envió una solicitud de amistad";
        case "ACCEPT_FRIEND":
            return "Aceptó una solicitud de amistad";
        case "REJECT_FRIEND":
            return "Rechazó una solicitud de amistad";
        case "BLOCK_USER":
            return "Bloqueó a un usuario";
        case "UNBLOCK_USER":
            return "Desbloqueó a un usuario";
        case "CREATE_COMMENT":
            return metadata.chapterName
                ? `Comentó "${String(metadata.content).slice(0, 60)}" en el capítulo ${metadata.chapterName} de "${metadata.seriesName}"`
                : `Comentó "${String(metadata.content).slice(0, 60)}" en "${metadata.seriesName}"`;
        case "DELETE_COMMENT":
            return metadata.chapterName
                ? `Eliminó un comentario en el capítulo ${metadata.chapterName} de "${metadata.seriesName}"`
                : `Eliminó un comentario en "${metadata.seriesName}"`;
        case "REPORT_COMMENT":
            return `Reportó un comentario: "${String(metadata.content).slice(0, 60)}" (${REPORT_REASON_LABELS[String(metadata.reason)] ?? metadata.reason})`;
        case "DELETE_CHAT_MESSAGE":
            return `Eliminó un mensaje del chat: "${String(metadata.content).slice(0, 60)}"`;
        case "REPORT_CHAT_MESSAGE":
            return `Reportó un mensaje del chat: "${String(metadata.content).slice(0, 60)}" (${REPORT_REASON_LABELS[String(metadata.reason)] ?? metadata.reason})`;
        case "MUTE_CHAT_USER": {
            let text = `Silenció a ${metadata.targetUserName ? `@${metadata.targetUserName}` : "un usuario del chat"}`;
            if (metadata.mutedUntil) {
                text += ` hasta el ${new Date(String(metadata.mutedUntil)).toLocaleString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;
            } else {
                text += " permanentemente";
            }
            return text;
        }
        case "UNMUTE_CHAT_USER":
            return "Desileneció a un usuario del chat";
        case "UPDATE_PROFILE":
            return `Actualizó su perfil: ${metadata.field}`;
        default:
            return JSON.stringify(metadata).slice(0, 60);
    }
}

const VALID_EVENTS = Object.keys(EVENT_LABELS);

export default function AdminActivityLogs() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
    const [meta, setMeta] = useState({ total: 0, page: 1, limit: 15, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState(searchParams.get("search") ?? "");
    const searchInputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleLogClick = (log: ActivityLogEntry) => {
        if (log.event !== "CREATE_COMMENT" && log.event !== "DELETE_COMMENT") return;
        const m = log.metadata as Record<string, unknown> | null;
        if (m?.seriesSlug && m?.chapterId && m?.commentId) {
            navigate(`/manga/${m.seriesSlug}/capitulo/${m.chapterId}#comment-${m.commentId}`);
        }
    };

    const rawEvent = searchParams.get("event");
    const eventFilter = rawEvent && VALID_EVENTS.includes(rawEvent) ? rawEvent : "";
    const page = parseInt(searchParams.get("page") || "1");
    const searchQuery = searchParams.get("search") ?? "";

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit: 15 };
            if (eventFilter) params.event = eventFilter;
            if (searchQuery) params.search = searchQuery;
            const res = await getActivityLogs(params);
            setLogs(res.data);
            setMeta(res.meta);
        } catch {
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [page, eventFilter, searchQuery]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const updateFilter = (key: string, value: string) => {
        const next = new URLSearchParams(searchParams);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== "page") next.set("page", "1");
        setSearchParams(next);
    };

    const handleSearchChange = (value: string) => {
        setSearchText(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!value.trim()) {
            updateFilter("search", "");
            return;
        }
        debounceRef.current = setTimeout(() => updateFilter("search", value), 400);
    };

    const clearSearch = () => {
        setSearchText("");
        if (debounceRef.current) clearTimeout(debounceRef.current);
        updateFilter("search", "");
        searchInputRef.current?.focus();
    };

    const hasActiveFilter = eventFilter !== "";

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <SEO title="Registro de actividad" />

            <AdminHeader
                icon={ScrollText}
                title="Actividad"
                search={{
                    placeholder: "Buscar por usuario...",
                    value: searchText,
                    onChange: handleSearchChange,
                    onEnter: (value) => {
                        if (debounceRef.current) clearTimeout(debounceRef.current);
                        updateFilter("search", value);
                    },
                    onClear: clearSearch,
                    inputRef: searchInputRef,
                }}
            >
                <FilterDrawer title="Filtros" activeFiltersCount={hasActiveFilter ? 1 : 0} onClearAll={() => { const next = new URLSearchParams(searchParams); next.delete("event"); next.set("page", "1"); setSearchParams(next); }}>
                    <div className="px-6 py-5 border-b border-border">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Evento</p>
                        <div className="flex flex-wrap gap-2">
                            {VALID_EVENTS.map((evt) => (
                                <Badge
                                    key={evt}
                                    variant={eventFilter === evt ? "default" : "outline"}
                                    className="cursor-pointer text-xs px-3 py-1"
                                    onClick={() => updateFilter("event", eventFilter === evt ? "" : evt)}
                                >
                                    {EVENT_LABELS[evt]}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </FilterDrawer>
            </AdminHeader>

            <main className="container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0 overflow-x-hidden">
                {loading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-10 rounded-lg" />
                        {Array.from({ length: 15 }).map((_, i) => (
                            <Skeleton key={i} className="h-[52px] rounded-lg" />
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center flex-1">
                        <div className="size-14 rounded-full bg-muted/30 flex items-center justify-center">
                            <ScrollText className="size-7 text-muted-foreground/30" />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-base font-medium text-muted-foreground/70">
                                {eventFilter || searchQuery ? "Sin resultados" : "Sin actividad"}
                            </p>
                            <p className="text-sm text-muted-foreground/50">
                                {eventFilter || searchQuery ? "Prueba con otros filtros o búsqueda" : "El registro de actividad estará disponible cuando los usuarios interactúen"}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="border border-border rounded-lg overflow-hidden bg-card">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/20">
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Usuario</th>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Evento</th>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Detalle</th>
                                            <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {logs.map((log) => {
                                            const isClickable = log.event === "CREATE_COMMENT" || log.event === "DELETE_COMMENT";
                                            const m = log.metadata as Record<string, unknown> | null;
                                            const hasNav = isClickable && m?.seriesSlug && m?.chapterId && m?.commentId;
                                            return (
                                            <tr
                                                key={log.id}
                                                onClick={hasNav ? () => handleLogClick(log) : undefined}
                                                className={cn(
                                                    "transition-colors",
                                                    hasNav ? "cursor-pointer hover:bg-muted/40" : "hover:bg-muted/30",
                                                )}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        {log.user.avatarUrl ? (
                                                            <img
                                                                src={`${AVATAR_API}/uploads/avatars/${log.user.avatarUrl}`}
                                                                alt=""
                                                                className="size-8 rounded-full object-cover shrink-0"
                                                            />
                                                        ) : (
                                                            <div className="size-8 rounded-full bg-muted-foreground/10 flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                                                                {log.user.name[0].toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium truncate max-w-[160px]">
                                                                {log.user.name} {log.user.lastname}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground/60 truncate max-w-[160px]">
                                                                {log.user.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <EventBadge event={log.event} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-muted-foreground/70">
                                                        {formatMetadata(log.event, log.metadata)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="text-sm text-muted-foreground/70 whitespace-nowrap">{formatDateTime(log.createdAt)}</span>
                                                </td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        {meta.totalPages > 1 && (
                            <div className="pt-3 shrink-0 border-t border-border mt-3">
                                <MangaPagination page={meta.page} totalPages={meta.totalPages} setPage={(p) => updateFilter("page", String(p))} />
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
