import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getUsers, updateUserRole, updateUserStatus, getActivityLogs, getUserStatusHistory } from "@/api/admin";
import type { AdminUser, UserRole, UserStatus, ActivityLogEntry, UserStatusHistory } from "@/types/admin";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetClose,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { MangaPagination } from "@/components/MangaPagination";
import { FilterDrawer } from "@/components/FilterDrawer";
import { SEO } from "@/components/seo";
import { AdminHeader } from "@/components/AdminHeader";
import { cn } from "@/lib/utils";
import {
    Users,
    Shield,
    Mail,
    Calendar,
    Clock,
    MessageSquare,
    Bookmark,
    BookOpen,
    ScrollText,
    ArrowLeft,
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
};

const STATUS_LABELS: Record<UserStatus, string> = {
    ACTIVE: "Activo",
    BANNED: "Baneado",
    SUSPENDED: "Suspendido",
};

const STATUS_COLORS: Record<UserStatus, string> = {
    ACTIVE: "text-green-600 dark:text-green-400",
    BANNED: "text-red-600 dark:text-red-400",
    SUSPENDED: "text-yellow-600 dark:text-yellow-400",
};

const VALID_ROLES = ["ADMIN", "USER"] as const;
const VALID_STATUSES = ["ACTIVE", "BANNED", "SUSPENDED"] as const;

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatDateTime(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatRelative(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return "hace " + mins + " min";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return "hace " + hrs + " h";
    const days = Math.floor(hrs / 24);
    if (days < 7) return "hace " + days + (days > 1 ? " dias" : " dia");
    return formatDate(iso);
}

const ROLE_LABELS: Record<string, string> = { ADMIN: "admin", USER: "usuario" };
const USER_STATUS_LABELS: Record<string, string> = { ACTIVE: "activo", BANNED: "baneado", SUSPENDED: "suspendido" };
const SUGGESTION_STATUS_LABELS: Record<string, string> = {
    OPEN: "abierta", REVIEWING: "revisando", RESOLVED: "resuelta", REJECTED: "rechazada", CLOSED: "cerrada",
};

function formatLogMetadata(event: string, metadata: Record<string, unknown> | null): string {
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
            return `Comentó "${String(metadata.content).slice(0, 60)}" en el capítulo ${metadata.chapterName} de "${metadata.seriesName}"`;
        case "DELETE_COMMENT":
            return `Eliminó un comentario en el capítulo ${metadata.chapterName} de "${metadata.seriesName}"`;
        case "UPDATE_PROFILE":
            return `Actualizó su perfil: ${metadata.field}`;
        default:
            return JSON.stringify(metadata).slice(0, 60);
    }
}

function StatusText({ status }: { status: UserStatus }) {
    return <span className={cn("text-xs font-medium", STATUS_COLORS[status])}>{STATUS_LABELS[status]}</span>;
}

function UserRow({ user, isSelected, onClick }: { user: AdminUser; isSelected: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg transition-all",
                isSelected
                    ? "bg-muted border border-border/50 shadow-sm"
                    : "hover:bg-muted/40 border border-transparent",
            )}
        >
            <div className="flex items-center gap-3">
                {user.avatarUrl ? (
                    <img
                        src={`${AVATAR_API}/uploads/avatars/${user.avatarUrl}`}
                        alt=""
                        className="size-9 rounded-full object-cover shrink-0"
                    />
                ) : (
                    <div className="size-9 rounded-full bg-muted-foreground/10 flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                        {user.name[0].toUpperCase()}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{user.name} {user.lastname}</span>
                        <StatusText status={user.status} />
                    </div>
                    <p className="text-xs text-muted-foreground/60 truncate">{user.email}</p>
                </div>
            </div>
            <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground/50">
                <span className="flex items-center gap-1">
                    <MessageSquare className="size-3" />
                    {user._count.comments}
                </span>
                <span className="flex items-center gap-1">
                    <MessageSquare className="size-3" />
                    {user._count.suggestions}
                </span>
                <span className="flex items-center gap-1">
                    <Bookmark className="size-3" />
                    {user._count.favorites}
                </span>
                <span className="flex items-center gap-1">
                    <BookOpen className="size-3" />
                    {user._count.chapterReads}
                </span>
            </div>
        </button>
    );
}

function DetailPanel({ user, onRoleChange, onStatusChange, logs, logsLoading, statusHistory }: {
    user: AdminUser;
    onRoleChange: (userId: string, role: UserRole) => void;
    onStatusChange: (userId: string, status: UserStatus, suspendedUntil?: string) => void;
    logs: ActivityLogEntry[];
    logsLoading: boolean;
    statusHistory: UserStatusHistory | null;
}) {
    const [suspendDraft, setSuspendDraft] = useState(false);
    const [suspendDraftDate, setSuspendDraftDate] = useState("");
    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    {user.avatarUrl ? (
                        <img
                            src={`${AVATAR_API}/uploads/avatars/${user.avatarUrl}`}
                            alt=""
                            className="size-10 rounded-full object-cover shrink-0"
                        />
                    ) : (
                        <div className="size-10 rounded-full bg-muted-foreground/10 flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground">
                            {user.name[0].toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold leading-snug">{user.name} {user.lastname}</h2>
                        <div className="flex items-center gap-2">
                            <StatusText status={user.status} />
                            <span className="text-xs text-muted-foreground/50">·</span>
                            <span className="text-xs text-muted-foreground/60">
                                {user.role === "ADMIN" ? "Admin" : "Usuario"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Select value={user.role} onValueChange={(v) => onRoleChange(user.id, v as UserRole)}>
                    <SelectTrigger className="min-w-[8rem] h-9 text-sm shrink-0">
                        <Shield className="size-4 mr-1 shrink-0" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem className="text-sm" value="USER">Usuario</SelectItem>
                        <SelectItem className="text-sm" value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={user.status} onValueChange={(v) => onStatusChange(user.id, v as UserStatus)}>
                    <SelectTrigger className="min-w-[8rem] h-9 text-sm shrink-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem className="text-sm" value="ACTIVE">Activo</SelectItem>
                        <SelectItem className="text-sm" value="SUSPENDED">Suspendido</SelectItem>
                        <SelectItem className="text-sm" value="BANNED">Baneado</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {suspendDraft && (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">Hasta:</span>
                    <input
                        type="datetime-local"
                        value={suspendDraftDate}
                        onChange={(e) => setSuspendDraftDate(e.target.value)}
                        className="flex-1 h-7 rounded-md border border-input bg-transparent px-2 text-xs"
                    />
                    <button
                        onClick={() => {
                            onStatusChange(user.id, "SUSPENDED", suspendDraftDate || undefined);
                            setSuspendDraft(false);
                        }}
                        className="h-7 shrink-0 rounded-md bg-primary text-primary-foreground px-3 text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                        Guardar
                    </button>
                </div>
            )}
            {user.status === "SUSPENDED" && user.suspendedUntil && (
                <div className="flex items-center gap-2 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    <Clock className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="text-amber-700 dark:text-amber-300">
                        Suspendido hasta el {new Date(user.suspendedUntil).toLocaleString("es-ES", {
                            day: "numeric", month: "long", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                        })}
                    </span>
                </div>
            )}

            <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="size-4 shrink-0" />
                    <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="size-4 shrink-0" />
                    <span>Registrado el {formatDate(user.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="size-4 shrink-0" />
                    <span>Última conexión: {formatDateTime(user.lastLoginAt)}</span>
                </div>
            </div>

            <div className="border-t border-border pt-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">Actividad</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-muted/20 rounded-lg border border-border p-3 text-center">
                        <p className="text-lg font-semibold">{user._count.comments}</p>
                        <p className="text-xs text-muted-foreground">Comentarios</p>
                    </div>
                    <div className="bg-muted/20 rounded-lg border border-border p-3 text-center">
                        <p className="text-lg font-semibold">{user._count.suggestions}</p>
                        <p className="text-xs text-muted-foreground">Sugerencias</p>
                    </div>
                    <div className="bg-muted/20 rounded-lg border border-border p-3 text-center">
                        <p className="text-lg font-semibold">{user._count.favorites}</p>
                        <p className="text-xs text-muted-foreground">Favoritos</p>
                    </div>
                    <div className="bg-muted/20 rounded-lg border border-border p-3 text-center">
                        <p className="text-lg font-semibold">{user._count.chapterReads}</p>
                        <p className="text-xs text-muted-foreground">Lecturas</p>
                    </div>
                </div>
            </div>

            <div className="border-t border-border pt-4">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-3">
                    <ScrollText className="size-4" />
                    Últimos eventos
                    {statusHistory && (statusHistory.suspensionCount > 0 || statusHistory.banCount > 0) && (
                        <span className="text-muted-foreground/50 font-normal ml-auto">
                            {statusHistory.suspensionCount > 0 && `${statusHistory.suspensionCount} susp.`}
                            {statusHistory.suspensionCount > 0 && statusHistory.banCount > 0 && " · "}
                            {statusHistory.banCount > 0 && `${statusHistory.banCount} ban.`}
                            {user.status === "SUSPENDED" && user.suspendedUntil && ` · hasta ${new Date(user.suspendedUntil).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`}
                        </span>
                    )}
                </div>
                {logsLoading ? (
                    <div className="space-y-2 py-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 rounded-md" />
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50 text-center py-6">Sin actividad registrada</p>
                ) : (
                    <div className="space-y-1.5">
                        {logs.slice(0, 10).map((log) => (
                            <div key={log.id} className="flex items-start gap-3 py-2.5 px-3 rounded-lg bg-muted/20 border border-border/50 hover:bg-muted/30 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <span className={cn("inline-block text-xs font-medium px-2 py-0.5 rounded border", EVENT_COLORS[log.event] ?? "bg-muted text-muted-foreground border-border")}>
                                        {EVENT_LABELS[log.event] ?? log.event}
                                    </span>
                                    {log.metadata && (
                                        <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                                            {formatLogMetadata(log.event, log.metadata)}
                                        </p>
                                    )}
                                </div>
                                <time className="text-xs text-muted-foreground/50 shrink-0 pt-0.5">
                                    {formatRelative(log.createdAt)}
                                </time>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AdminUsers() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [userLogs, setUserLogs] = useState<ActivityLogEntry[]>([]);
    const [userLogsLoading, setUserLogsLoading] = useState(false);
    const [statusHistory, setStatusHistory] = useState<UserStatusHistory | null>(null);
    const [searchText, setSearchText] = useState(searchParams.get("search") ?? "");
    const [sheetOpen, setSheetOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [suspensionDialogUserId, setSuspensionDialogUserId] = useState<string | null>(null);
    const [suspensionDate, setSuspensionDate] = useState("");
    const [banDialogUserId, setBanDialogUserId] = useState<string | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const rawRole = searchParams.get("role");
    const rawStatus = searchParams.get("status");
    const roleFilter = rawRole && VALID_ROLES.includes(rawRole as "ADMIN" | "USER") ? rawRole : "";
    const statusFilter = rawStatus && VALID_STATUSES.includes(rawStatus as UserStatus) ? rawStatus : "";
    const page = parseInt(searchParams.get("page") || "1");
    const searchQuery = searchParams.get("search") ?? "";

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit: 20 };
            if (roleFilter) params.role = roleFilter;
            if (statusFilter) params.status = statusFilter;
            if (searchQuery) params.search = searchQuery;
            const res = await getUsers(params);
            setUsers(res.data);
            setMeta(res.meta);
        } catch {
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, [page, roleFilter, statusFilter, searchQuery]);

    useEffect(() => {
        const mq = window.matchMedia("(max-width: 1023px)");
        setIsMobile(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        if (selectedId && !users.find((u) => u.id === selectedId)) {
            setSelectedId(null);
        }
    }, [users, selectedId]);

    useEffect(() => {
        if (!selectedId) {
            setUserLogs([]);
            setStatusHistory(null);
            return;
        }
        setUserLogsLoading(true);
        Promise.all([
            getActivityLogs({ userId: selectedId, limit: 10 }),
            getUserStatusHistory(selectedId),
        ]).then(([logsRes, historyRes]) => {
            setUserLogs(logsRes.data);
            setStatusHistory(historyRes.data);
            setUserLogsLoading(false);
        }).catch(() => {
            setUserLogs([]);
            setStatusHistory(null);
            setUserLogsLoading(false);
        });

    }, [selectedId]);

    const selected = users.find((u) => u.id === selectedId) ?? null;

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

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        try {
            const res = await updateUserRole(userId, newRole);
            fetchUsers();
            toast.success("Rol actualizado", {
                description: `${res.data.name} ${res.data.lastname} ahora es ${newRole === "ADMIN" ? "admin" : "usuario"}`,
            });
        } catch {
            toast.error("Error al actualizar el rol");
        }
    };

    const handleStatusChange = (userId: string, newStatus: UserStatus) => {
        if (newStatus === "SUSPENDED") {
            const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const offset = defaultDate.getTimezoneOffset();
            const local = new Date(defaultDate.getTime() - offset * 60000).toISOString().slice(0, 16);
            setSuspensionDate(local);
            setSuspensionDialogUserId(userId);
        } else if (newStatus === "BANNED") {
            setBanDialogUserId(userId);
        } else {
            doStatusChange(userId, newStatus);
        }
    };

    const doStatusChange = async (userId: string, newStatus: UserStatus, suspendedUntil?: string) => {
        try {
            const res = await updateUserStatus(userId, newStatus, suspendedUntil);
            fetchUsers();
            toast.success("Estado actualizado", {
                description: `${res.data.name} ${res.data.lastname} ahora está ${STATUS_LABELS[newStatus].toLowerCase()}`,
            });
        } catch {
            toast.error("Error al actualizar el estado");
        }
    };

    const handleSelectUser = (id: string) => {
        setSelectedId(id);
        if (isMobile) setSheetOpen(true);
    };

    const activeFiltersCount = [roleFilter, statusFilter].filter(Boolean).length;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <SEO title="Administrar usuarios" />

            <AdminHeader
                icon={Users}
                title="Usuarios"
                search={{
                    placeholder: "Buscar...",
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
                <FilterDrawer title="Filtros" activeFiltersCount={activeFiltersCount} onClearAll={() => { const next = new URLSearchParams(searchParams); next.delete("role"); next.delete("status"); next.set("page", "1"); setSearchParams(next); }}>
                    <div className="px-6 py-5 border-b border-border">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Rol</p>
                        <div className="flex flex-wrap gap-2">
                            {VALID_ROLES.map((r) => (
                                <Badge
                                    key={r}
                                    variant={roleFilter === r ? "default" : "outline"}
                                    className="cursor-pointer text-xs px-3 py-1"
                                    onClick={() => updateFilter("role", roleFilter === r ? "" : r)}
                                >
                                    {r === "ADMIN" ? "Admin" : "Usuario"}
                                </Badge>
                            ))}
                        </div>
                    </div>
                    <div className="px-6 py-5 border-b border-border">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Estado</p>
                        <div className="flex flex-wrap gap-2">
                            {VALID_STATUSES.map((s) => (
                                <Badge
                                    key={s}
                                    variant={statusFilter === s ? "default" : "outline"}
                                    className="cursor-pointer text-xs px-3 py-1"
                                    onClick={() => updateFilter("status", statusFilter === s ? "" : s)}
                                >
                                    {STATUS_LABELS[s]}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </FilterDrawer>
            </AdminHeader>

            <main className="container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0 overflow-x-hidden">
                {loading ? (
                    <div className="flex gap-5 flex-1 min-h-0">
                        <div className="flex flex-col w-full lg:w-[360px] xl:w-[400px] lg:shrink-0 gap-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-[60px] rounded-lg" />
                            ))}
                        </div>
                        <div className="hidden lg:block flex-1 border-l border-border pl-5">
                            <Skeleton className="h-[400px] rounded-xl" />
                        </div>
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center flex-1">
                        <div className="size-14 rounded-full bg-muted/30 flex items-center justify-center">
                            <Users className="size-7 text-muted-foreground/30" />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-base font-medium text-muted-foreground/70">
                                {activeFiltersCount > 0 || searchQuery ? "Sin resultados" : "No hay usuarios"}
                            </p>
                            <p className="text-sm text-muted-foreground/50">
                                {activeFiltersCount > 0 || searchQuery ? "Prueba con otros filtros o búsqueda" : "Los usuarios nuevos aparecerán aquí"}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-5 flex-1 min-h-0">
                        <div className="flex flex-col w-full lg:w-[360px] xl:w-[400px] lg:shrink-0 min-h-0">
                            <div className="flex-1 overflow-y-auto space-y-px">
                                {users.map((u) => (
                                    <UserRow
                                        key={u.id}
                                        user={u}
                                        isSelected={selectedId === u.id}
                                        onClick={() => handleSelectUser(u.id)}
                                    />
                                ))}
                            </div>
                            {meta.totalPages > 1 && (
                                <div className="pt-3 shrink-0 border-t border-border mt-2">
                                    <MangaPagination page={meta.page} totalPages={meta.totalPages} setPage={(p) => updateFilter("page", String(p))} />
                                </div>
                            )}
                        </div>

                        <div className="hidden lg:flex flex-col flex-1 min-w-0 border-l border-border pl-5 min-h-0">
                            {selected ? (
                                <div className="flex-1 overflow-y-auto">
                                    <DetailPanel user={selected} onRoleChange={handleRoleChange} onStatusChange={handleStatusChange} logs={userLogs} logsLoading={userLogsLoading} statusHistory={statusHistory} />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full min-h-[200px]">
                                    <p className="text-sm text-muted-foreground/50">Selecciona un usuario</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            <Dialog open={!!suspensionDialogUserId} onOpenChange={(open) => { if (!open) setSuspensionDialogUserId(null); }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Fecha de suspensión</DialogTitle>
                        <DialogDescription>
                            Selecciona hasta cuándo estará suspendido el usuario. No podrá acceder hasta esa fecha.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 py-2">
                        <Label htmlFor="suspendedUntil">Suspender hasta</Label>
                        <Input
                            id="suspendedUntil"
                            type="datetime-local"
                            value={suspensionDate}
                            onChange={(e) => setSuspensionDate(e.target.value)}
                            min={new Date().toISOString().slice(0, 16)}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSuspensionDialogUserId(null)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            disabled={!suspensionDate}
                            onClick={() => {
                                if (!suspensionDialogUserId) return;
                                doStatusChange(suspensionDialogUserId, "SUSPENDED", suspensionDate);
                                setSuspensionDialogUserId(null);
                            }}
                        >
                            Confirmar suspensión
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!banDialogUserId} onOpenChange={(open) => { if (!open) setBanDialogUserId(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Banear usuario?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. El usuario será bloqueado permanentemente y no podrá acceder a su cuenta.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (!banDialogUserId) return;
                                doStatusChange(banDialogUserId, "BANNED");
                                setBanDialogUserId(null);
                            }}
                        >
                            Banear
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setSelectedId(null); }}>
                <SheetContent side="bottom" className="rounded-t-xl max-h-[80vh] flex flex-col gap-0 p-0">
                    <SheetHeader className="px-6 py-5 border-b border-border flex-row items-center gap-2">
                        <SheetClose className="shrink-0"><ArrowLeft className="size-5" /></SheetClose>
                        <SheetTitle className="text-base">Detalle</SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        {selected && <DetailPanel user={selected} onRoleChange={handleRoleChange} onStatusChange={handleStatusChange} logs={userLogs} logsLoading={userLogsLoading} statusHistory={statusHistory} />}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
