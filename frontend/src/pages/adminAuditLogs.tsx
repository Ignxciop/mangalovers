import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { getAdminAuditLogs } from "@/api/admin";
import type { AdminAuditLogEntry } from "@/types/admin";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { MangaPagination } from "@/components/MangaPagination";
import { SEO } from "@/components/seo";
import { cn } from "@/lib/utils";
import {
    ShieldAlert,
    Search,
    X,
} from "lucide-react";
import { FilterDrawer } from "@/components/FilterDrawer";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const ACTION_LABELS: Record<string, string> = {
    UPDATE_ROLE: "Cambio de rol",
    UPDATE_USER_STATUS: "Cambio de estado",
    UPDATE_SUGGESTION_STATUS: "Estado de sugerencia",
};

const ACTION_COLORS: Record<string, string> = {
    UPDATE_ROLE: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    UPDATE_USER_STATUS: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    UPDATE_SUGGESTION_STATUS: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
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

function ActionBadge({ action }: { action: string }) {
    return (
        <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border",
            ACTION_COLORS[action] ?? "bg-muted text-muted-foreground border-border",
        )}>
            {ACTION_LABELS[action] ?? action}
        </span>
    );
}

const VALID_ACTIONS = Object.keys(ACTION_LABELS);

export default function AdminAuditLogs() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [logs, setLogs] = useState<AdminAuditLogEntry[]>([]);
    const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState(searchParams.get("admin") ?? "");
    const searchInputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const rawAction = searchParams.get("action");
    const actionFilter = rawAction && VALID_ACTIONS.includes(rawAction) ? rawAction : "";
    const page = parseInt(searchParams.get("page") || "1");
    const adminQuery = searchParams.get("admin") ?? "";

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit: 20 };
            if (actionFilter) params.action = actionFilter;
            if (adminQuery) params.adminId = adminQuery;
            const res = await getAdminAuditLogs(params);
            setLogs(res.data);
            setMeta(res.meta);
        } catch {
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [page, actionFilter, adminQuery]);

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
            updateFilter("admin", "");
            return;
        }
        debounceRef.current = setTimeout(() => updateFilter("admin", value), 400);
    };

    const clearSearch = () => {
        setSearchText("");
        if (debounceRef.current) clearTimeout(debounceRef.current);
        updateFilter("admin", "");
        searchInputRef.current?.focus();
    };

    const hasActiveFilter = actionFilter !== "";

    function formatDetail(entry: AdminAuditLogEntry): string {
        const m = entry.metadata;
        if (!m) return "";
        switch (entry.action) {
            case "UPDATE_ROLE":
                return `${m.oldRole ?? "?"} → ${m.newRole as string}`;
            case "UPDATE_USER_STATUS":
                return `${m.oldStatus ?? "?"} → ${m.newStatus as string}`;
            case "UPDATE_SUGGESTION_STATUS":
                return `Sugerencia #${entry.targetId}: ${m.oldStatus ?? "?"} → ${m.newStatus as string}`;
            default:
                return JSON.stringify(m).slice(0, 60);
        }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
            <SEO title="Auditoría de administración" />

            <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border">
                <div className="container mx-auto grid grid-cols-[auto_1fr_auto] items-center h-14 px-4 gap-3">
                    <SidebarTrigger />
                    <div className="flex items-center gap-3 min-w-0 max-w-xl mx-auto w-full">
                        <span className="text-xs font-medium text-muted-foreground shrink-0 hidden sm:block">
                            Auditoría
                        </span>
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                            <Input
                                ref={searchInputRef}
                                placeholder="Buscar por admin..."
                                className="pl-7 pr-7 h-7 text-xs bg-muted/40 border-none"
                                value={searchText}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        if (debounceRef.current) clearTimeout(debounceRef.current);
                                        updateFilter("admin", searchText);
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
                        activeCount={hasActiveFilter ? 1 : 0}
                        title="Filtrar por acción"
                        admin
                    >
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground mb-2">Acción</p>
                            <div className="flex flex-wrap gap-1.5">
                                {VALID_ACTIONS.map((act) => (
                                    <UIBadge
                                        key={act}
                                        variant={actionFilter === act ? "default" : "outline"}
                                        className="cursor-pointer text-[10px] px-2 py-0.5"
                                        onClick={() => updateFilter("action", actionFilter === act ? "" : act)}
                                    >
                                        {ACTION_LABELS[act]}
                                    </UIBadge>
                                ))}
                            </div>
                        </div>
                    </FilterDrawer>
                </div>
            </header>

            <main className="container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0">
                {loading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-10 rounded-lg" />
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-[52px] rounded-lg" />
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center flex-1">
                        <div className="size-12 rounded-full bg-muted/30 flex items-center justify-center">
                            <ShieldAlert className="size-6 text-muted-foreground/30" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground/70">
                                {actionFilter || adminQuery ? "Sin resultados" : "Sin registros de auditoría"}
                            </p>
                            <p className="text-xs text-muted-foreground/50">
                                {actionFilter || adminQuery ? "Probá con otros filtros o búsqueda" : "Las acciones administrativas aparecerán aquí"}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="border border-border rounded-lg overflow-hidden bg-card">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/20">
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Admin</th>
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Acción</th>
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Detalle</th>
                                            <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="size-6 rounded-full bg-muted-foreground/10 flex items-center justify-center shrink-0 text-[9px] font-bold text-muted-foreground">
                                                            {log.admin.name[0].toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[11px] font-medium truncate max-w-[140px]">
                                                                {log.admin.name} {log.admin.lastname}
                                                            </p>
                                                            <p className="text-[10px] text-muted-foreground/60 truncate max-w-[140px]">
                                                                {log.admin.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <ActionBadge action={log.action} />
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <span className="text-[10px] text-muted-foreground/70">
                                                        {formatDetail(log)}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <span className="text-[10px] text-muted-foreground/70 whitespace-nowrap">{formatDateTime(log.createdAt)}</span>
                                                </td>
                                            </tr>
                                        ))}
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
