import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getUsers, updateUserRole, updateUserStatus, getActivityLogs } from "@/api/admin";
import type { AdminUser, UserRole, UserStatus, ActivityLogEntry } from "@/types/admin";
import { Input } from "@/components/ui/input";
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
import { FilterDrawer } from "@/components/FilterDrawer";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { MangaPagination } from "@/components/MangaPagination";
import { SEO } from "@/components/seo";
import { cn } from "@/lib/utils";
import {
    Users,
    Search,
    X,
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

const EVENT_LABELS: Record<string, string> = {
    REGISTER: "Registro",
    LOGIN: "Inicio de sesión",
    LOGOUT: "Cierre de sesión",
    ADD_FAVORITE: "Añadir favorito",
    REMOVE_FAVORITE: "Quitar favorito",
    MARK_READ: "Marcar leído",
    SEND_SUGGESTION: "Enviar sugerencia",
    UPDATE_SUGGESTION_STATUS: "Estado sugerencia",
    UPDATE_ROLE: "Cambio de rol",
    UPDATE_USER_STATUS: "Cambio de estado",
    API_ERROR: "Error de API",
    RATE_LIMIT: "Límite excedido",
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

function formatLogMetadata(event: string, metadata: Record<string, unknown> | null): string {
    if (!metadata) return "";
    switch (event) {
        case "MARK_READ":
            return (metadata.seriesName ? String(metadata.seriesName) + " - " : "") + "Cap. " + (metadata.chapterName ?? metadata.chapterId);
        case "ADD_FAVORITE":
        case "REMOVE_FAVORITE":
            if (metadata.seriesName) return '"' + metadata.seriesName + '"';
            return JSON.stringify(metadata).slice(0, 60);
        case "SEND_SUGGESTION":
            if (typeof metadata.title === "string") return metadata.title.slice(0, 60);
            return JSON.stringify(metadata).slice(0, 60);
        default:
            return JSON.stringify(metadata).slice(0, 60);
    }
}

function StatusText({ status }: { status: UserStatus }) {
    return <span className={cn("text-[11px] font-medium", STATUS_COLORS[status])}>{STATUS_LABELS[status]}</span>;
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
            <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-full bg-muted-foreground/10 flex items-center justify-center shrink-0 text-[11px] font-bold text-muted-foreground">
                    {user.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate">{user.name} {user.lastname}</span>
                        <StatusText status={user.status} />
                    </div>
                    <p className="text-[11px] text-muted-foreground/60 truncate">{user.email}</p>
                </div>
            </div>
            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/50">
                <span className="flex items-center gap-1">
                    <MessageSquare className="size-2.5" />
                    {user._count.suggestions}
                </span>
                <span className="flex items-center gap-1">
                    <Bookmark className="size-2.5" />
                    {user._count.favorites}
                </span>
                <span className="flex items-center gap-1">
                    <BookOpen className="size-2.5" />
                    {user._count.chapterReads}
                </span>
            </div>
        </button>
    );
}

function DetailPanel({ user, onRoleChange, onStatusChange, logs, logsLoading }: {
    user: AdminUser;
    onRoleChange: (userId: string, role: UserRole) => void;
    onStatusChange: (userId: string, status: UserStatus) => void;
    logs: ActivityLogEntry[];
    logsLoading: boolean;
}) {
    return (
        <div className="space-y-4 text-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-full bg-muted-foreground/10 flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                        {user.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold leading-snug">{user.name} {user.lastname}</h2>
                        <div className="flex items-center gap-2">
                            <StatusText status={user.status} />
                            <span className="text-[10px] text-muted-foreground/50">·</span>
                            <span className="text-[10px] text-muted-foreground/60">
                                {user.role === "ADMIN" ? "Admin" : "Usuario"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Select value={user.role} onValueChange={(v) => onRoleChange(user.id, v as UserRole)}>
                    <SelectTrigger className="min-w-[7rem] h-7 text-xs shrink-0">
                        <Shield className="size-3 mr-1 shrink-0" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="USER">Usuario</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={user.status} onValueChange={(v) => onStatusChange(user.id, v as UserStatus)}>
                    <SelectTrigger className="min-w-[7rem] h-7 text-xs shrink-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ACTIVE">Activo</SelectItem>
                        <SelectItem value="SUSPENDED">Suspendido</SelectItem>
                        <SelectItem value="BANNED">Baneado</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="border-t border-border pt-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="size-3.5 shrink-0" />
                    <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="size-3.5 shrink-0" />
                    <span>Registrado el {formatDate(user.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="size-3.5 shrink-0" />
                    <span>Última conexión: {formatDateTime(user.lastLoginAt)}</span>
                </div>
            </div>

            <div className="border-t border-border pt-3">
                <p className="text-[11px] font-medium text-muted-foreground mb-2">Actividad</p>
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-muted/20 rounded border border-border p-2 text-center">
                        <p className="text-sm font-semibold">{user._count.suggestions}</p>
                        <p className="text-[10px] text-muted-foreground">Sugerencias</p>
                    </div>
                    <div className="bg-muted/20 rounded border border-border p-2 text-center">
                        <p className="text-sm font-semibold">{user._count.favorites}</p>
                        <p className="text-[10px] text-muted-foreground">Favoritos</p>
                    </div>
                    <div className="bg-muted/20 rounded border border-border p-2 text-center">
                        <p className="text-sm font-semibold">{user._count.chapterReads}</p>
                        <p className="text-[10px] text-muted-foreground">Lecturas</p>
                    </div>
                </div>
            </div>

            <div className="border-t border-border pt-3">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-2">
                    <ScrollText className="size-3" />
                    Últimos eventos
                </div>
                {logsLoading ? (
                    <div className="space-y-2 py-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 rounded-md" />
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/50 text-center py-6">Sin actividad registrada</p>
                ) : (
                    <div className="space-y-1.5">
                        {logs.slice(0, 10).map((log) => (
                            <div key={log.id} className="flex items-start gap-2 py-2 px-2.5 rounded-lg bg-muted/20 border border-border/50 hover:bg-muted/30 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <span className={cn("inline-block text-[10px] font-medium px-1.5 py-0.5 rounded border", EVENT_COLORS[log.event] ?? "bg-muted text-muted-foreground border-border")}>
                                        {EVENT_LABELS[log.event] ?? log.event}
                                    </span>
                                    {log.metadata && (
                                        <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">
                                            {formatLogMetadata(log.event, log.metadata)}
                                        </p>
                                    )}
                                </div>
                                <time className="text-[10px] text-muted-foreground/50 shrink-0 pt-0.5">
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
    const [searchText, setSearchText] = useState(searchParams.get("search") ?? "");
    const [sheetOpen, setSheetOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
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
            return;
        }
        setUserLogsLoading(true);
        getActivityLogs({ userId: selectedId, limit: 10 }).then((res) => {
            setUserLogs(res.data);
            setUserLogsLoading(false);
        }).catch(() => {
            setUserLogs([]);
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

    const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
        try {
            const res = await updateUserStatus(userId, newStatus);
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
        <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
            <SEO title="Administrar usuarios" />

            <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border">
                <div className="container mx-auto grid grid-cols-[auto_1fr_auto] items-center h-14 px-4 gap-3">
                    <SidebarTrigger />
                    <div className="flex items-center gap-3 min-w-0 max-w-xl mx-auto w-full">
                        <span className="text-xs font-medium text-muted-foreground shrink-0 hidden sm:block">
                            Usuarios
                        </span>
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                            <Input
                                ref={searchInputRef}
                                placeholder="Buscar..."
                                className="pl-7 pr-7 h-7 text-xs bg-muted/40 border-none"
                                value={searchText}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        if (debounceRef.current) clearTimeout(debounceRef.current);
                                        updateFilter("search", searchText);
                                    }
                                }}
                            />
                            {searchText && (
                                <button onClick={clearSearch} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    <X className="size-3" />
                                </button>
                            )}
                        </div>
                    </div>
                    <FilterDrawer
                        activeCount={activeFiltersCount}
                        title="Filtros"
                        admin
                    >
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground mb-2">Rol</p>
                            <div className="flex flex-wrap gap-1.5">
                                {VALID_ROLES.map((r) => (
                                    <Badge
                                        key={r}
                                        variant={roleFilter === r ? "default" : "outline"}
                                        className="cursor-pointer text-[10px] px-2 py-0.5"
                                        onClick={() => updateFilter("role", roleFilter === r ? "" : r)}
                                    >
                                        {r === "ADMIN" ? "Admin" : "Usuario"}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground mb-2">Estado</p>
                            <div className="flex flex-wrap gap-1.5">
                                {VALID_STATUSES.map((s) => (
                                    <Badge
                                        key={s}
                                        variant={statusFilter === s ? "default" : "outline"}
                                        className="cursor-pointer text-[10px] px-2 py-0.5"
                                        onClick={() => updateFilter("status", statusFilter === s ? "" : s)}
                                    >
                                        {STATUS_LABELS[s]}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </FilterDrawer>
                </div>
            </header>

            <main className="container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0">
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
                        <div className="size-12 rounded-full bg-muted/30 flex items-center justify-center">
                            <Users className="size-6 text-muted-foreground/30" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground/70">
                                {activeFiltersCount > 0 || searchQuery ? "Sin resultados" : "No hay usuarios"}
                            </p>
                            <p className="text-xs text-muted-foreground/50">
                                {activeFiltersCount > 0 || searchQuery ? "Probá con otros filtros o búsqueda" : "Los usuarios nuevos aparecerán aquí"}
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

                        <div className="hidden lg:block flex-1 min-w-0 border-l border-border pl-5">
                            {selected ? (
                                <div className="sticky top-0">
                                    <DetailPanel user={selected} onRoleChange={handleRoleChange} onStatusChange={handleStatusChange} logs={userLogs} logsLoading={userLogsLoading} />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full min-h-[200px]">
                                    <p className="text-xs text-muted-foreground/50">Seleccioná un usuario</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setSelectedId(null); }}>
                <SheetContent side="bottom" className="rounded-t-lg max-h-[80vh] flex flex-col gap-0 p-0">
                    <SheetHeader className="px-4 py-2.5 border-b border-border shrink-0 flex-row items-center gap-2">
                        <SheetClose className="shrink-0"><ArrowLeft className="size-4" /></SheetClose>
                        <SheetTitle className="text-xs font-medium">Detalle</SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto p-4">
                        {selected && <DetailPanel user={selected} onRoleChange={handleRoleChange} onStatusChange={handleStatusChange} logs={userLogs} logsLoading={userLogsLoading} />}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
