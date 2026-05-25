import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getUsers, updateUserRole } from "@/api/admin";
import type { AdminUser, UserRole } from "@/types/admin";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { MangaPagination } from "@/components/MangaPagination";
import { SEO } from "@/components/seo";
import { cn } from "@/lib/utils";
import {
    Users,
    Search,
    X,
    Shield,
    UserRound,
    Mail,
    CalendarDays,
    MessageSquare,
    Bookmark,
    BookOpen,
} from "lucide-react";

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function RoleBadge({ role }: { role: UserRole }) {
    const isAdmin = role === "ADMIN";
    return (
        <Badge
            variant={isAdmin ? "default" : "outline"}
            className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                isAdmin
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                    : "text-muted-foreground border-border",
            )}
        >
            <Shield className={cn("size-2.5 mr-1", isAdmin ? "text-amber-500" : "text-muted-foreground/50")} />
            {isAdmin ? "Admin" : "Usuario"}
        </Badge>
    );
}

function UserCard({
    user,
    isSelected,
    onClick,
}: {
    user: AdminUser;
    isSelected: boolean;
    onClick: () => void;
}) {
    const initial = user.name[0].toUpperCase();
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full text-left rounded-lg border transition-all duration-150 px-3 py-3",
                isSelected
                    ? "border-primary/40 bg-muted/80 shadow-sm"
                    : "border-border bg-card hover:bg-muted/50",
            )}
        >
            <div className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-muted-foreground/10 flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground">
                    {initial}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                            {user.name} {user.lastname}
                        </span>
                        <RoleBadge role={user.role} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                </div>
            </div>
            <div className="flex items-center gap-3 mt-2.5 text-[11px] text-muted-foreground">
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

function UserDetailPanel({
    user,
    onRoleChange,
}: {
    user: AdminUser;
    onRoleChange: (userId: string, role: UserRole) => void;
}) {
    const initial = user.name[0].toUpperCase();
    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full bg-muted-foreground/10 flex items-center justify-center shrink-0 text-lg font-bold text-muted-foreground">
                        {initial}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold leading-snug">
                            {user.name} {user.lastname}
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <RoleBadge role={user.role} />
                        </div>
                    </div>
                </div>
                <Select
                    value={user.role}
                    onValueChange={(v) => onRoleChange(user.id, v as UserRole)}
                >
                    <SelectTrigger className="w-28 h-8 text-xs shrink-0">
                        <Shield className="size-3 mr-1.5 shrink-0" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="USER">Usuario</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                    <Mail className="size-4 text-muted-foreground shrink-0" />
                    <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="size-4 text-muted-foreground shrink-0" />
                    <span>Registrado el {formatDate(user.createdAt)}</span>
                </div>
            </div>

            <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Actividad
                </p>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/30 rounded-lg border border-border p-3 text-center">
                        <MessageSquare className="size-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-lg font-bold">{user._count.suggestions}</p>
                        <p className="text-[10px] text-muted-foreground">Sugerencias</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg border border-border p-3 text-center">
                        <Bookmark className="size-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-lg font-bold">{user._count.favorites}</p>
                        <p className="text-[10px] text-muted-foreground">Favoritos</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg border border-border p-3 text-center">
                        <BookOpen className="size-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-lg font-bold">{user._count.chapterReads}</p>
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
    const searchInputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const rawRole = searchParams.get("role");
    const roleFilter = rawRole === "ADMIN" || rawRole === "USER" ? rawRole : "";
    const page = parseInt(searchParams.get("page") || "1");
    const searchQuery = searchParams.get("search") ?? "";

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit: 20 };
            if (roleFilter) params.role = roleFilter;
            if (searchQuery) params.search = searchQuery;
            const res = await getUsers(params);
            setUsers(res.data);
            setMeta(res.meta);
        } catch {
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, [page, roleFilter, searchQuery]);

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
        if (value) {
            next.set(key, value);
        } else {
            next.delete(key);
        }
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
        debounceRef.current = setTimeout(() => {
            updateFilter("search", value);
        }, 400);
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
                description: `${res.data.name} ${res.data.lastname} ahora es ${newRole === "ADMIN" ? "administrador" : "usuario"}`,
            });
        } catch {
            toast.error("Error al actualizar el rol");
        }
    };

    const tabs = [
        { value: "", label: "Todos", color: "" },
        { value: "USER" as const, label: "Usuarios", color: "text-blue-500" },
        { value: "ADMIN" as const, label: "Administradores", color: "text-amber-500" },
    ];

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <SEO title="Administrar usuarios" />

            <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border shadow-[0_1px_0_0] shadow-brand/5">
                <div className="container mx-auto grid grid-cols-[auto_1fr_auto] items-center h-16 px-4 gap-4">
                    <SidebarTrigger />
                    <div className="flex justify-center min-w-0">
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0 w-full max-w-xl">
                            <div className="hidden sm:flex items-center gap-2 shrink-0">
                                <Users className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-semibold text-foreground tracking-wide">Usuarios</span>
                            </div>
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    ref={searchInputRef}
                                    placeholder="Buscar por nombre o email..."
                                    className="pl-8 pr-9 w-full bg-secondary/50 h-8 text-xs sm:h-9 sm:text-sm"
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
                                    <button
                                        onClick={clearSearch}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {tabs.filter((t) => t.value).map((tab) => (
                            <button
                                key={tab.value}
                                onClick={() => updateFilter("role", roleFilter === tab.value ? "" : tab.value)}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                    roleFilter === tab.value
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 flex-1 flex flex-col min-h-0">
                {!loading && users.length > 0 && meta.totalPages > 1 && (
                    <div className="mb-4">
                        <MangaPagination
                            page={meta.page}
                            totalPages={meta.totalPages}
                            setPage={(p) => updateFilter("page", String(p))}
                        />
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="size-7 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center flex-1">
                        <Users className="h-12 w-12 text-muted-foreground/30" />
                        <p className="text-muted-foreground text-sm">
                            {roleFilter || searchQuery
                                ? "No hay usuarios con estos filtros"
                                : "No hay usuarios registrados"}
                        </p>
                    </div>
                ) : (
                    <div className="flex gap-6 flex-1 min-h-0">
                        <div className="flex flex-col w-full lg:w-[380px] xl:w-[420px] lg:shrink-0 min-h-0">
                            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                                {users.map((u) => (
                                    <UserCard
                                        key={u.id}
                                        user={u}
                                        isSelected={selectedId === u.id}
                                        onClick={() => setSelectedId(u.id)}
                                    />
                                ))}
                            </div>

                            {meta.totalPages > 1 && (
                                <div className="pt-4 shrink-0 border-t border-border mt-3">
                                    <MangaPagination
                                        page={meta.page}
                                        totalPages={meta.totalPages}
                                        setPage={(p) => updateFilter("page", String(p))}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="hidden lg:block flex-1 min-w-0 border-l border-border pl-6">
                            {selected ? (
                                <div className="sticky top-0">
                                    <UserDetailPanel
                                        user={selected}
                                        onRoleChange={handleRoleChange}
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 text-center">
                                    <UserRound className="h-10 w-10 text-muted-foreground/20" />
                                    <p className="text-sm text-muted-foreground">
                                        Seleccioná un usuario para ver sus detalles
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
