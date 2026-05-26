import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { getActivityLogs } from "@/api/admin";
import type { ActivityLogEntry } from "@/types/admin";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { MangaPagination } from "@/components/MangaPagination";
import { SEO } from "@/components/seo";
import { cn } from "@/lib/utils";
import {
    ScrollText,
    Search,
    X,
    SlidersHorizontal,
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
            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border",
            EVENT_COLORS[event] ?? "bg-muted text-muted-foreground border-border",
        )}>
            {EVENT_LABELS[event] ?? event}
        </span>
    );
}

function formatMetadata(event: string, metadata: Record<string, unknown> | null): string {
    if (!metadata) return "";
    switch (event) {
        case "MARK_READ": {
            const parts: string[] = [];
            if (metadata.seriesName) parts.push(String(metadata.seriesName));
            if (metadata.chapterId) parts.push("Cap. " + metadata.chapterId);
            const count = Number(metadata.count);
            if (count > 1) parts.push(count + " marcados");
            return parts.join(" · ");
        }
        case "ADD_FAVORITE":
        case "REMOVE_FAVORITE":
            if (metadata.seriesName) return `"${metadata.seriesName}"`;
            return JSON.stringify(metadata).slice(0, 60);
        case "SEND_SUGGESTION":
            if (typeof metadata.title === "string") return metadata.title.slice(0, 60);
            return JSON.stringify(metadata).slice(0, 60);
        default:
            return JSON.stringify(metadata).slice(0, 60);
    }
}

const VALID_EVENTS = Object.keys(EVENT_LABELS);

export default function AdminActivityLogs() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
    const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState(searchParams.get("search") ?? "");
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const rawEvent = searchParams.get("event");
    const eventFilter = rawEvent && VALID_EVENTS.includes(rawEvent) ? rawEvent : "";
    const page = parseInt(searchParams.get("page") || "1");
    const searchQuery = searchParams.get("search") ?? "";

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit: 20 };
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
        <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
            <SEO title="Registro de actividad" />

            <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border">
                <div className="container mx-auto grid grid-cols-[auto_1fr_auto] items-center h-14 px-4 gap-3">
                    <SidebarTrigger />
                    <div className="flex items-center gap-3 min-w-0 max-w-xl mx-auto w-full">
                        <span className="text-xs font-medium text-muted-foreground shrink-0 hidden sm:block">
                            Actividad
                        </span>
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                            <Input
                                ref={searchInputRef}
                                placeholder="Buscar por usuario..."
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
                                {hasActiveFilter && (
                                    <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-primary text-primary-foreground text-[6px] flex items-center justify-center font-bold">
                                        1
                                    </span>
                                )}
                            </button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-64">
                            <SheetHeader className="pb-3">
                                <SheetTitle className="text-xs font-medium">Filtrar por evento</SheetTitle>
                            </SheetHeader>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[11px] font-medium text-muted-foreground mb-2">Evento</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {VALID_EVENTS.map((evt) => (
                                            <Badge
                                                key={evt}
                                                variant={eventFilter === evt ? "default" : "outline"}
                                                className="cursor-pointer text-[10px] px-2 py-0.5"
                                                onClick={() => {
                                                    updateFilter("event", eventFilter === evt ? "" : evt);
                                                    setFilterSheetOpen(false);
                                                }}
                                            >
                                                {EVENT_LABELS[evt]}
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
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center flex-1">
                        <ScrollText className="size-8 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">
                            {eventFilter || searchQuery ? "No hay actividad con estos filtros" : "No hay actividad registrada"}
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="border border-border rounded-md overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/20">
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Usuario</th>
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Evento</th>
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Detalle</th>
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground text-[10px] uppercase tracking-wider hidden md:table-cell">IP</th>
                                            <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="size-6 rounded-full bg-muted-foreground/10 flex items-center justify-center shrink-0 text-[9px] font-bold text-muted-foreground">
                                                            {log.user.name[0].toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[11px] font-medium truncate max-w-[140px]">
                                                                {log.user.name} {log.user.lastname}
                                                            </p>
                                                            <p className="text-[10px] text-muted-foreground/60 truncate max-w-[140px]">
                                                                {log.user.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <EventBadge event={log.event} />
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <span className="text-[10px] text-muted-foreground/70">
                                                        {formatMetadata(log.event, log.metadata)}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 hidden md:table-cell">
                                                    <span className="text-[10px] text-muted-foreground/50 font-mono">{log.ip ?? "—"}</span>
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
