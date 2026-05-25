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
import { MangaPagination } from "@/components/MangaPagination";
import { SEO } from "@/components/seo";
import { timeAgo } from "@/lib/date";
import {
    MessageSquare,
    Search,
    ExternalLink,
    X,
    UserRound,
    Clock,
    RefreshCw,
    SlidersHorizontal,
    ArrowLeft,
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

const STATUS_VARIANTS: Record<SuggestionStatus, string> = {
    OPEN: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700",
    REVIEWING: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300 dark:border-blue-700",
    RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700",
    REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700",
    CLOSED: "bg-muted text-muted-foreground border-border",
};

const TYPE_BADGE_VARIANTS: Record<SuggestionType, string> = {
    BUG: "border-red-300 text-red-700 dark:border-red-700 dark:text-red-300",
    SUGGESTION: "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300",
    CONTENT_ERROR: "border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300",
    TECHNICAL_PROBLEM: "border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300",
    OTHER: "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400",
};

const ALL_STATUSES: SuggestionStatus[] = ["OPEN", "REVIEWING", "RESOLVED", "REJECTED", "CLOSED"];
const VALID_TYPES = ["BUG", "SUGGESTION", "CONTENT_ERROR", "TECHNICAL_PROBLEM", "OTHER"];
const VALID_STATUSES = ["OPEN", "REVIEWING", "RESOLVED", "REJECTED", "CLOSED"];

function isLowPriority(status: SuggestionStatus) {
    return status === "RESOLVED" || status === "REJECTED" || status === "CLOSED";
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function UserAvatar({ name, lastname, email }: { name?: string; lastname?: string; email?: string }) {
    const initial = name ? name[0].toUpperCase() : "?";
    return (
        <div className="flex items-center gap-2 min-w-0">
            <div className="size-6 rounded-full bg-muted-foreground/10 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-muted-foreground">{initial}</span>
            </div>
            <span className="text-xs text-muted-foreground truncate">
                {name ? `${name} ${lastname}` : email ?? "Desconocido"}
            </span>
        </div>
    );
}

type MetaCounts = Record<string, number> & { total: number };

function SuggestionDetailPanel({
    suggestion,
    onStatusChange,
}: {
    suggestion: Suggestion;
    onStatusChange: (id: number, status: SuggestionStatus) => void;
}) {
    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <span
                            className={`text-xs font-medium px-2 py-0.5 rounded border ${STATUS_VARIANTS[suggestion.status]}`}
                        >
                            {STATUS_LABELS[suggestion.status]}
                        </span>
                        <span
                            className={`text-xs font-medium px-2 py-0.5 rounded border ${TYPE_BADGE_VARIANTS[suggestion.type]}`}
                        >
                            {TYPE_LABELS[suggestion.type]}
                        </span>
                    </div>
                    <h2 className="text-lg font-bold leading-snug break-words">{suggestion.title}</h2>
                </div>
                <Select
                    value={suggestion.status}
                    onValueChange={(v) => onStatusChange(suggestion.id, v as SuggestionStatus)}
                >
                    <SelectTrigger className="w-36 h-8 text-xs shrink-0">
                        <RefreshCw className="size-3 mr-1.5 shrink-0" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Descripción
                </p>
                <div className="bg-muted/30 rounded-lg border border-border p-3">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">
                        {suggestion.description}
                    </p>
                </div>
            </div>

            {suggestion.image && (
                <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Captura
                    </p>
                    <a
                        href={suggestion.image}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                        <ExternalLink className="size-3.5" />
                        Ver captura
                    </a>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Usuario
                    </p>
                    <div className="flex items-center gap-2">
                        <UserRound className="size-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                                {suggestion.user?.name} {suggestion.user?.lastname}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {suggestion.user?.email}
                            </p>
                        </div>
                    </div>
                </div>
                <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Fechas
                    </p>
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="size-3 shrink-0" />
                            <span>Creado: {formatDate(suggestion.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="size-3 shrink-0" />
                            <span>Modificado: {formatDate(suggestion.updatedAt)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {suggestion.reviewedBy && (
                <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Revisado por
                    </p>
                    <UserAvatar
                        name={suggestion.reviewedBy.name}
                        lastname={suggestion.reviewedBy.lastname}
                        email={suggestion.reviewedBy.email}
                    />
                </div>
            )}
        </div>
    );
}

export default function SuggestionsAdmin() {
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
    const typeFilter = rawType && VALID_TYPES.includes(rawType) ? rawType : "";
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
        <div className="min-h-screen bg-background flex flex-col">
            <SEO title="Administrar sugerencias" />

            <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border shadow-[0_1px_0_0] shadow-brand/5">
                <div className="container mx-auto grid grid-cols-[auto_1fr_auto] items-center h-16 px-4 gap-4">
                    <SidebarTrigger />
                    <div className="flex justify-center min-w-0">
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0 w-full max-w-xl">
                            <div className="hidden sm:flex items-center gap-2 shrink-0">
                                <MessageSquare className="h-4 w-4 text-amber-500" />
                                <span className="text-sm font-semibold text-foreground tracking-wide">Sugerencias</span>
                            </div>
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    ref={searchInputRef}
                                    placeholder="Buscar..."
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
                    <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                        <SheetTrigger asChild>
                            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted relative" aria-label="Filtrar por tipo">
                                <SlidersHorizontal className="size-4" />
                                {activeFiltersCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground text-[8px] flex items-center justify-center font-bold">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-72 sm:w-80">
                            <SheetHeader className="pb-4">
                                <SheetTitle className="text-base">Filtrar por tipo</SheetTitle>
                            </SheetHeader>
                            <div className="flex flex-wrap gap-2 pb-6">
                                {VALID_TYPES.map((t) => (
                                    <Badge
                                        key={t}
                                        variant={typeFilter === t ? "default" : "outline"}
                                        className="cursor-pointer px-3 py-1.5 text-xs"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => {
                                            updateFilter("type", typeFilter === t ? "" : t);
                                            setFilterSheetOpen(false);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                updateFilter("type", typeFilter === t ? "" : t);
                                                setFilterSheetOpen(false);
                                            }
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

            <main className="container mx-auto px-4 py-6 flex-1 flex flex-col min-h-0">
                {!loading && suggestions.length > 0 && (
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
                ) : suggestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center flex-1">
                        <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
                        <p className="text-muted-foreground text-sm">
                            {activeFiltersCount > 0 || searchQuery
                                ? "No hay sugerencias con estos filtros"
                                : "No hay sugerencias"}
                        </p>
                    </div>
                ) : (
                    <div className="flex gap-6 flex-1 min-h-0">
                        <div className="flex flex-col w-full lg:w-[380px] xl:w-[420px] lg:shrink-0 min-h-0">
                            <div className="flex flex-wrap gap-1 pb-3 shrink-0">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.value}
                                        onClick={() => updateFilter("status", tab.value)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                            statusFilter === tab.value
                                                ? "bg-primary text-primary-foreground"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        }`}
                                    >
                                        {tab.label}
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${
                                            statusFilter === tab.value
                                                ? "bg-primary-foreground/20 text-primary-foreground"
                                                : "bg-muted-foreground/10 text-muted-foreground"
                                        }`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                                {suggestions.map((s) => {
                                    const isSelected = selectedId === s.id;
                                    const low = isLowPriority(s.status);
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => handleSelectSuggestion(s.id)}
                                            className={`w-full text-left rounded-lg border transition-all duration-150 ${
                                                isSelected
                                                    ? "border-primary/40 bg-muted/80 shadow-sm"
                                                    : low
                                                        ? "border-transparent bg-transparent hover:bg-muted/30"
                                                        : "border-border bg-card hover:bg-muted/50"
                                            } ${low ? "opacity-60" : ""}`}
                                        >
                                            <div className="px-3 py-2.5">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span
                                                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${STATUS_VARIANTS[s.status]}`}
                                                    >
                                                        {STATUS_LABELS[s.status]}
                                                    </span>
                                                    <span
                                                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${TYPE_BADGE_VARIANTS[s.type]}`}
                                                    >
                                                        {TYPE_LABELS[s.type]}
                                                    </span>
                                                </div>
                                                <p className={`text-sm font-medium leading-snug line-clamp-1 ${low ? "text-muted-foreground" : ""}`}>
                                                    {s.title}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground/70">
                                                    <UserAvatar
                                                        name={s.user?.name}
                                                        lastname={s.user?.lastname}
                                                        email={s.user?.email}
                                                    />
                                                    <span>·</span>
                                                    <span>{timeAgo(s.createdAt)}</span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
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
                                    <SuggestionDetailPanel
                                        suggestion={selected}
                                        onStatusChange={handleStatusChange}
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 text-center">
                                    <MessageSquare className="h-10 w-10 text-muted-foreground/20" />
                                    <p className="text-sm text-muted-foreground">
                                        Seleccioná una sugerencia para ver sus detalles
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
                <SheetContent side="bottom" className="rounded-t-xl max-h-[85vh] flex flex-col gap-0 p-0">
                    <SheetHeader className="px-4 py-3 border-b border-border shrink-0 flex-row items-center gap-2">
                        <SheetClose className="shrink-0">
                            <ArrowLeft className="size-5" />
                        </SheetClose>
                        <SheetTitle className="text-sm font-semibold">Detalle de sugerencia</SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto p-4">
                        {selected && (
                            <SuggestionDetailPanel
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
