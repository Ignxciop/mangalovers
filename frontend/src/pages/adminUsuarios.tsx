import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getUsers, updateUserRole } from "@/api/admin";
import type { AdminUser, UserRole } from "@/types/admin";
import { Input } from "@/components/ui/input";
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
    MessageSquare,
    Bookmark,
    BookOpen,
    ArrowLeft,
} from "lucide-react";

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function RoleText({ role }: { role: UserRole }) {
    return (
        <span className={cn(
            "text-[11px] font-medium",
            role === "ADMIN" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
        )}>
            <Shield className="size-2.5 inline mr-0.5 align-text-top" />
            {role === "ADMIN" ? "Admin" : "Usuario"}
        </span>
    );
}

function UserRow({
    user,
    isSelected,
    onClick,
}: {
    user: AdminUser;
    isSelected: boolean;
    onClick: () => void;
}) {
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
                        <span className="text-xs font-medium truncate">
                            {user.name} {user.lastname}
                        </span>
                        <RoleText role={user.role} />
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

function DetailPanel({
    user,
    onRoleChange,
}: {
    user: AdminUser;
    onRoleChange: (userId: string, role: UserRole) => void;
}) {
    return (
        <div className="space-y-4 text-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-full bg-muted-foreground/10 flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                        {user.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold leading-snug">
                            {user.name} {user.lastname}
                        </h2>
                        <RoleText role={user.role} />
                    </div>
                </div>
                <Select
                    value={user.role}
                    onValueChange={(v) => onRoleChange(user.id, v as UserRole)}
                >
                    <SelectTrigger className="min-w-[7rem] h-7 text-xs shrink-0">
                        <Shield className="size-3 mr-1 shrink-0" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="USER">Usuario</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
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
    const [isMobile, setIsMobile] = useState(false);
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

    const handleSelectUser = (id: string) => {
        setSelectedId(id);
        if (isMobile) setSheetOpen(true);
    };

    const tabs = [
        { value: "", label: "Todos" },
        { value: "USER" as const, label: "Usuarios" },
        { value: "ADMIN" as const, label: "Administradores" },
    ];

    return (
        <div className="min-h-screen bg-background flex flex-col">
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
                                <button
                                    onClick={clearSearch}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {tabs.filter((t) => t.value).map((tab) => (
                            <button
                                key={tab.value}
                                onClick={() => updateFilter("role", roleFilter === tab.value ? "" : tab.value)}
                                className={cn(
                                    "px-2.5 py-1 text-[11px] font-medium rounded transition-colors",
                                    roleFilter === tab.value
                                        ? "bg-muted text-foreground"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
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
                            {roleFilter || searchQuery
                                ? "No hay usuarios con estos filtros"
                                : "No hay usuarios registrados"}
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
                                    <MangaPagination
                                        page={meta.page}
                                        totalPages={meta.totalPages}
                                        setPage={(p) => updateFilter("page", String(p))}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="hidden lg:block flex-1 min-w-0 border-l border-border pl-5">
                            {selected ? (
                                <div className="sticky top-0">
                                    <DetailPanel
                                        user={selected}
                                        onRoleChange={handleRoleChange}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full min-h-[200px]">
                                    <p className="text-xs text-muted-foreground/50">
                                        Seleccioná un usuario
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            <Sheet open={sheetOpen} onOpenChange={(open) => {
                setSheetOpen(open);
                if (!open) setSelectedId(null);
            }}>
                <SheetContent side="bottom" className="rounded-t-lg max-h-[80vh] flex flex-col gap-0 p-0">
                    <SheetHeader className="px-4 py-2.5 border-b border-border shrink-0 flex-row items-center gap-2">
                        <SheetClose className="shrink-0">
                            <ArrowLeft className="size-4" />
                        </SheetClose>
                        <SheetTitle className="text-xs font-medium">Detalle</SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto p-4">
                        {selected && (
                            <DetailPanel
                                user={selected}
                                onRoleChange={handleRoleChange}
                            />
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
