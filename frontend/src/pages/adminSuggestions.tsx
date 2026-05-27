import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getAllSuggestions, updateSuggestionStatus } from "@/api/suggestions";
import type { Suggestion, SuggestionType, SuggestionStatus } from "@/types/suggestion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetClose,
    SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { MangaPagination } from "@/components/MangaPagination";
import { SEO } from "@/components/seo";
import { timeAgo } from "@/lib/date";
import { cn } from "@/lib/utils";
import {
    MessageSquare,
    Search,
    X,
    RefreshCw,
    SlidersHorizontal,
    ArrowLeft,
    User,
    Calendar,
    Tag,
} from "lucide-react";

const TYPE_LABELS: Record<SuggestionType, string> = {
    BUG: "Bug",
    SUGGESTION: "Sugerencia",
    CONTENT_ERROR: "Error de contenido",
    TECHNICAL_PROBLEM: "Problema técnico",
    OTHER: "Otro",
};

const STATUS_LABELS: Record<SuggestionStatus, string> = {
    OPEN: "Abiertas",
    REVIEWING: "Revisando",
    RESOLVED: "Resueltas",
    REJECTED: "Rechazadas",
    CLOSED: "Cerradas",
};

const STATUS_COLORS: Record<SuggestionStatus, string> = {
    OPEN: "text-yellow-600 dark:text-yellow-400",
    REVIEWING: "text-blue-600 dark:text-blue-400",
    RESOLVED: "text-green-600 dark:text-green-400",
    REJECTED: "text-red-600 dark:text-red-400",
    CLOSED: "text-muted-foreground",
};

const ALL_STATUSES: SuggestionStatus[] = ["OPEN", "REVIEWING", "RESOLVED", "REJECTED", "CLOSED"];
const VALID_TYPES = ["BUG", "SUGGESTION", "CONTENT_ERROR", "TECHNICAL_PROBLEM", "OTHER"];
const VALID_STATUSES = ["OPEN", "REVIEWING", "RESOLVED", "REJECTED", "CLOSED"];

function isResolved(status: SuggestionStatus) {
    return status === "RESOLVED" || status === "REJECTED" || status === "CLOSED";
}

type MetaCounts = Record<string, number> & { total: number };

function DetailPanel({
    suggestion,
    onStatusChange,
}: {
    suggestion: Suggestion;
    onStatusChange: (id: number, status: SuggestionStatus) => void;
}) {
    return (
        <div className="space-y-4 text-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                    <span className={cn("text-xs font-medium", STATUS_COLORS[suggestion.status])}>
                        {STATUS_LABELS[suggestion.status]}
                    </span>
                    <h2 className="text-base font-semibold leading-snug break-words">
                        {suggestion.title}
                    </h2>
                    <span className="text-xs text-muted-foreground">{TYPE_LABELS[suggestion.type]}</span>
                </div>
                <Select
                    value={suggestion.status}
                    onValueChange={(v) => onStatusChange(suggestion.id, v as SuggestionStatus)}
                >
                    <SelectTrigger className="min-w-[8rem] h-7 text-xs shrink-0">
                        <RefreshCw className="size-3 mr-1 shrink-0" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="bg-muted/10 rounded-lg border border-border/60 p-3 text-xs leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                {suggestion.description}
            </div>

            {suggestion.image && (
                <a
                    href={suggestion.image}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                    Ver captura
                </a>
            )}

            <div className="border-t border-border pt-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="size-3.5 shrink-0" />
                    <span>
                        {suggestion.user?.name
                            ? `${suggestion.user.name} ${suggestion.user.lastname}`
                            : suggestion.user?.email ?? "—"}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="size-3.5 shrink-0" />
                    <span>{new Date(suggestion.createdAt).toLocaleDateString("es-ES", {
                        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}</span>
                </div>
                {suggestion.reviewedBy && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Tag className="size-3.5 shrink-0" />
                        <span>
                            Revisado por {suggestion.reviewedBy.name} {suggestion.reviewedBy.lastname}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AdminSuggestions() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [meta, setMeta] = useState<{ total: number; page: number; limit: number; totalPages: number; counts?: MetaCounts }>({ total: 0, page: 1, limit: 20, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [searchText, setSearchText] = useState(searchParams.get("search") ?? "");
    const [sheetOpen, setSheetOpen] = useState(false);
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const rawType = searchParams.get("type");
    const rawStatus = searchParams.get("status");
    const typeFilter = rawType && VALID_TYPES.includes(rawType as SuggestionType) ? rawType : "";
    const statusFilter = rawStatus && VALID_STATUSES.includes(rawStatus) ? rawStatus : "";
    const page = parseInt(searchParams.get("page") || "1");
    const searchQuery = searchParams.get("search") ?? "";

    const fetchSuggestions = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit: 20 };
            if (typeFilter) params.type = typeFilter;
            if (statusFilter) params.status = statusFilter;
            if (searchQuery) params.search = searchQuery;
            const res = await getAllSuggestions(params);
            setSuggestions(res.data);
            setMeta(res.meta);
        } catch {
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }, [page, typeFilter, statusFilter, searchQuery]);

    useEffect(() => {
        const mq = window.matchMedia("(max-width: 1023px)");
        setIsMobile(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    useEffect(() => {
        const next = new URLSearchParams(searchParams);
        let changed = false;
        for (const key of ["type", "status"]) {
            const val = next.get(key);
            if (val && !(key === "type" ? VALID_TYPES : VALID_STATUSES).includes(val)) {
                next.delete(key);
                changed = true;
            }
        }
        if (changed) setSearchParams(next, { replace: true });
    }, []);

    useEffect(() => {
        fetchSuggestions();
    }, [fetchSuggestions]);

    useEffect(() => {
        if (selectedId && !suggestions.find((s) => s.id === selectedId)) {
            setSelectedId(null);
        }
    }, [suggestions, selectedId]);

    const selected = suggestions.find((s) => s.id === selectedId) ?? null;
    const counts = meta.counts;

    const tabs = [
        { value: "", label: "Todas", count: counts?.total ?? 0 },
        ...ALL_STATUSES
            .filter((s) => (counts?.[s] ?? 0) > 0)
            .map((s) => ({ value: s, label: STATUS_LABELS[s], count: counts?.[s] ?? 0 })),
    ];

    const handleStatusChange = async (id: number, newStatus: SuggestionStatus) => {
        try {
            await updateSuggestionStatus(id, newStatus);
            fetchSuggestions();
            toast.success("Estado actualizado", {
                description: `Sugerencia #${id} marcada como ${STATUS_LABELS[newStatus].toLowerCase()}`,
            });
        } catch {
            toast.error("Error al actualizar el estado");
        }
    };

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

    const activeFiltersCount = [typeFilter].filter(Boolean).length;

    const handleSelectSuggestion = (id: number) => {
        setSelectedId(id);
        if (isMobile) setSheetOpen(true);
    };

    return (
        <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
            <SEO title="Administrar sugerencias" />

            <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border">
                <div className="container mx-auto grid grid-cols-[auto_1fr_auto] items-center h-14 px-4 gap-3">
                    <SidebarTrigger />
                    <div className="flex items-center gap-3 min-w-0 max-w-xl mx-auto w-full">
                        <span className="text-xs font-medium text-muted-foreground shrink-0 hidden sm:block">
                            Sugerencias
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
                    <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                        <SheetTrigger asChild>
                            <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted relative" aria-label="Filtrar por tipo">
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
                                <SheetTitle className="text-xs font-medium">Filtrar por tipo</SheetTitle>
                            </SheetHeader>
                            <div className="flex flex-wrap gap-1.5">
                                {VALID_TYPES.map((t) => (
                                    <Badge
                                        key={t}
                                        variant={typeFilter === t ? "default" : "outline"}
                                        className="cursor-pointer text-[10px] px-2 py-0.5"
                                        onClick={() => {
                                            updateFilter("type", typeFilter === t ? "" : t);
                                            setFilterSheetOpen(false);
                                        }}
                                    >
                                        {TYPE_LABELS[t as SuggestionType]}
                                    </Badge>
                                ))}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </header>

            <main className="container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0">
                {loading ? (
                    <div className="flex gap-5 flex-1 min-h-0">
                        <div className="flex flex-col w-full lg:w-[360px] xl:w-[400px] lg:shrink-0 gap-2">
                            <Skeleton className="h-8 rounded-lg" />
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-[68px] rounded-lg" />
                            ))}
                        </div>
                        <div className="hidden lg:block flex-1 border-l border-border pl-5">
                            <Skeleton className="h-[350px] rounded-xl" />
                        </div>
                    </div>
                ) : suggestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center flex-1">
                        <div className="size-12 rounded-full bg-muted/30 flex items-center justify-center">
                            <MessageSquare className="size-6 text-muted-foreground/30" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground/70">
                                {activeFiltersCount > 0 || searchQuery ? "Sin resultados" : "No hay sugerencias"}
                            </p>
                            <p className="text-xs text-muted-foreground/50">
                                {activeFiltersCount > 0 || searchQuery ? "Probá con otros filtros o búsqueda" : "Las sugerencias de los usuarios aparecerán aquí"}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-5 flex-1 min-h-0">
                        <div className="flex flex-col w-full lg:w-[360px] xl:w-[400px] lg:shrink-0 min-h-0">
                            <div className="flex items-center gap-1 pb-2 shrink-0 border-b border-border mb-2 overflow-x-auto">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.value}
                                        onClick={() => updateFilter("status", tab.value)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all shrink-0",
                                            statusFilter === tab.value
                                                ? "bg-muted text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                                        )}
                                    >
                                        {tab.label}
                                        <span className="text-[10px] text-muted-foreground/50">{tab.count}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-px">
                                {suggestions.map((s) => {
                                    const isSelected = selectedId === s.id;
                                    const resolved = isResolved(s.status);
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => handleSelectSuggestion(s.id)}
                                            className={cn(
                                                "w-full text-left px-3 py-2.5 rounded-lg transition-all",
                                                isSelected
                                                    ? "bg-muted border border-border/50 shadow-sm"
                                                    : "hover:bg-muted/40 border border-transparent",
                                                resolved && !isSelected && "opacity-50",
                                            )}
                                        >
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={cn("text-[11px] font-medium", STATUS_COLORS[s.status])}>
                                                    {STATUS_LABELS[s.status]}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground/50">
                                                    {TYPE_LABELS[s.type]}
                                                </span>
                                            </div>
                                            <p className={cn(
                                                "text-xs leading-snug truncate",
                                                resolved ? "text-muted-foreground" : "text-foreground",
                                            )}>
                                                {s.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground/50">
                                                <span>{s.user?.name ?? s.user?.email ?? "—"}</span>
                                                <span>·</span>
                                                <span>{timeAgo(s.createdAt)}</span>
                                            </div>
                                        </button>
                                    );
                                })}
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
                                        suggestion={selected}
                                        onStatusChange={handleStatusChange}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full min-h-[200px]">
                                    <p className="text-xs text-muted-foreground/50">
                                        Seleccioná una sugerencia
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
                                suggestion={selected}
                                onStatusChange={handleStatusChange}
                            />
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
