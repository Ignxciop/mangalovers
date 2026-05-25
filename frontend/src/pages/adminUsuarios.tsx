import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getUsers, updateUserRole, updateUserStatus } from "@/api/admin";
import type { AdminUser, UserRole, UserStatus } from "@/types/admin";
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
    SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
    SlidersHorizontal,
    ArrowLeft,
} from "lucide-react";

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

function StatusText({ status }: { status: UserStatus }) {
    return <span className={cn("text-[11px] font-medium", STATUS_COLORS[status])}>{STATUS_LABELS[status]}</span>;
}

function UserRow({ user, isSelected, onClick }: { user: AdminUser; isSelected: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full text-left px-3 py-2.5 rounded transition-colors",
                isSelected ? "bg-muted" : "hover:bg-muted/50",
            )}
        >
            <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-full bg-muted-foreground/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-muted-foreground">
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
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground/50">
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

function DetailPanel({ user, onRoleChange, onStatusChange }: {
    user: AdminUser;
    onRoleChange: (userId: string, role: UserRole) => void;
    onStatusChange: (userId: string, status: UserStatus) => void;
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
        </div>
    );
}

export default function AdminUsuarios() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchText, setSearchText] = useState(searchParams.get("search") ?? "");
    const [sheetOpen, setSheetOpen] = useState(false);
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);
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
                    <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                        <SheetTrigger asChild>
                            <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted relative" aria-label="Filtrar">
                                <SlidersHorizontal className="size-3.5" />
                                {activeFiltersCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-primary text-primary-foreground text-[6px] flex items-center justify-center font-bold">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-64">
                            <SheetHeader className="pb-3">
                                <SheetTitle className="text-xs font-medium">Filtros</SheetTitle>
                            </SheetHeader>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[11px] font-medium text-muted-foreground mb-2">Rol</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {VALID_ROLES.map((r) => (
                                            <Badge
                                                key={r}
                                                variant={roleFilter === r ? "default" : "outline"}
                                                className="cursor-pointer text-[10px] px-2 py-0.5"
                                                onClick={() => {
                                                    updateFilter("role", roleFilter === r ? "" : r);
                                                    setFilterSheetOpen(false);
                                                }}
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
                                                onClick={() => {
                                                    updateFilter("status", statusFilter === s ? "" : s);
                                                    setFilterSheetOpen(false);
                                                }}
                                            >
                                                {STATUS_LABELS[s]}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </header>

            <main className="container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="size-5 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center flex-1">
                        <Users className="size-8 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">
                            {activeFiltersCount > 0 || searchQuery ? "No hay usuarios con estos filtros" : "No hay usuarios registrados"}
                        </p>
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
                                    <DetailPanel user={selected} onRoleChange={handleRoleChange} onStatusChange={handleStatusChange} />
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
                        {selected && <DetailPanel user={selected} onRoleChange={handleRoleChange} onStatusChange={handleStatusChange} />}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
