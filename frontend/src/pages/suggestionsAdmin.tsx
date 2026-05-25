import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { getAllSuggestions, updateSuggestionStatus } from "@/api/suggestions";
import type { Suggestion, SuggestionType, SuggestionStatus } from "@/types/suggestion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { MangaPagination } from "@/components/MangaPagination";
import { SEO } from "@/components/seo";
import { ChevronDown, ChevronUp, ExternalLink, MessageSquare, SlidersHorizontal } from "lucide-react";

const TYPE_LABELS: Record<SuggestionType, string> = {
    BUG: "Bug",
    SUGGESTION: "Sugerencia",
    CONTENT_ERROR: "Error de contenido",
    TECHNICAL_PROBLEM: "Problema técnico",
    OTHER: "Otro",
};

const STATUS_LABELS: Record<SuggestionStatus, string> = {
    OPEN: "Abierto",
    REVIEWING: "Revisando",
    RESOLVED: "Resuelto",
    REJECTED: "Rechazado",
    CLOSED: "Cerrado",
};

const STATUS_VARIANTS: Record<SuggestionStatus, string> = {
    OPEN: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    REVIEWING: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    CLOSED: "bg-muted text-muted-foreground",
};

const VALID_TYPES = ["BUG", "SUGGESTION", "CONTENT_ERROR", "TECHNICAL_PROBLEM", "OTHER"];
const VALID_STATUSES = ["OPEN", "REVIEWING", "RESOLVED", "REJECTED", "CLOSED"];

type SortBy = "reciente" | "antiguo" | "tipo" | "estado";

export default function SuggestionsAdmin() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const rawType = searchParams.get("type");
    const rawStatus = searchParams.get("status");
    const typeFilter = rawType && VALID_TYPES.includes(rawType) ? rawType : "";
    const statusFilter = rawStatus && VALID_STATUSES.includes(rawStatus) ? rawStatus : "";
    const sortBy = (searchParams.get("sort") ?? "reciente") as SortBy;
    const page = parseInt(searchParams.get("page") || "1");

    const fetchSuggestions = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit: 20 };
            if (typeFilter) params.type = typeFilter;
            if (statusFilter) params.status = statusFilter;
            const res = await getAllSuggestions(params);
            setSuggestions(res.data);
            setMeta(res.meta);
        } catch {
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }, [page, typeFilter, statusFilter]);

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

    const sorted = sortSuggestions(suggestions, sortBy);

    const handleStatusChange = async (id: number, newStatus: SuggestionStatus) => {
        try {
            await updateSuggestionStatus(id, newStatus);
            fetchSuggestions();
        } catch {
            // Silenciar
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

    const setSortBy = (value: SortBy) => {
        updateFilter("sort", value === "reciente" ? "" : value);
    };

    const clearFilters = () => {
        setSearchParams({ page: "1" });
    };

    const activeFiltersCount = [
        typeFilter,
        statusFilter,
        sortBy !== "reciente" ? sortBy : "",
    ].filter(Boolean).length;

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString("es-ES", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    return (
        <div className="min-h-screen bg-background">
            <SEO title="Administrar sugerencias" />

            <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border shadow-[0_1px_0_0] shadow-brand/5">
                <div className="container mx-auto grid grid-cols-[auto_1fr_auto] items-center h-16 px-4 gap-4">
                    <SidebarTrigger />
                    <div className="flex justify-center min-w-0">
                        <div className="flex items-center gap-2 shrink-0">
                            <MessageSquare className="h-4 w-4 text-amber-500" />
                            <span className="text-sm font-semibold text-foreground tracking-wide">
                                Sugerencias
                            </span>
                        </div>
                    </div>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="relative"
                            >
                                <SlidersHorizontal className="mr-2 h-4 w-4" />
                                Filtros
                                {activeFiltersCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </Button>
                        </SheetTrigger>

                        <SheetContent className="flex flex-col gap-0 p-0">
                            <SheetHeader className="px-6 py-5 border-b border-border">
                                <SheetTitle className="text-base">
                                    Filtros
                                </SheetTitle>
                            </SheetHeader>

                            <div className="flex-1 overflow-y-auto">
                                <div className="px-6 py-5 border-b border-border">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                        Ordenar por
                                    </p>
                                    <Select
                                        value={sortBy}
                                        onValueChange={(v) => setSortBy(v as SortBy)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="reciente">Más reciente</SelectItem>
                                            <SelectItem value="antiguo">Más antiguo</SelectItem>
                                            <SelectItem value="tipo">Tipo</SelectItem>
                                            <SelectItem value="estado">Estado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="px-6 py-5 border-b border-border">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                        Tipo
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { label: "Todos", value: "" },
                                            ...Object.entries(TYPE_LABELS).map(([k, v]) => ({ label: v, value: k })),
                                        ].map(({ label, value }) => (
                                            <Badge
                                                key={value}
                                                variant={typeFilter === value ? "default" : "outline"}
                                                className="cursor-pointer px-3 py-1 text-xs"
                                                role="button"
                                                tabIndex={0}
                                                onClick={() =>
                                                    updateFilter("type", typeFilter === value ? "" : value)
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        updateFilter("type", typeFilter === value ? "" : value);
                                                    }
                                                }}
                                            >
                                                {label}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="px-6 py-5">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                        Estado
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { label: "Todos", value: "" },
                                            ...Object.entries(STATUS_LABELS).map(([k, v]) => ({ label: v, value: k })),
                                        ].map(({ label, value }) => (
                                            <Badge
                                                key={value}
                                                variant={statusFilter === value ? "default" : "outline"}
                                                className="cursor-pointer px-3 py-1 text-xs"
                                                role="button"
                                                tabIndex={0}
                                                onClick={() =>
                                                    updateFilter("status", statusFilter === value ? "" : value)
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        updateFilter("status", statusFilter === value ? "" : value);
                                                    }
                                                }}
                                            >
                                                {label}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {activeFiltersCount > 0 && (
                                <div className="px-6 py-4 border-t border-border">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={clearFilters}
                                    >
                                        Limpiar todos los filtros
                                    </Button>
                                </div>
                            )}
                        </SheetContent>
                    </Sheet>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {!loading && sorted.length > 0 && (
                    <div className="mb-6">
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
                ) : sorted.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                        <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
                        <p className="text-muted-foreground text-sm">
                            {activeFiltersCount > 0
                                ? "No hay sugerencias con estos filtros"
                                : "No hay sugerencias"}
                        </p>
                        {activeFiltersCount > 0 && (
                            <button
                                onClick={clearFilters}
                                className="text-sm text-primary underline underline-offset-4"
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {sorted.map((s) => {
                            const isOpen = expandedId === s.id;
                            return (
                                <div
                                    key={s.id}
                                    className="border border-border rounded-xl bg-card overflow-hidden"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setExpandedId(isOpen ? null : s.id)}
                                        className="w-full flex items-start gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] sm:text-[11px] uppercase tracking-wider"
                                                >
                                                    {TYPE_LABELS[s.type]}
                                                </Badge>
                                                <span
                                                    className={`text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full leading-none ${STATUS_VARIANTS[s.status]}`}
                                                >
                                                    {STATUS_LABELS[s.status]}
                                                </span>
                                            </div>
                                            <p className="text-sm sm:text-base font-medium leading-snug line-clamp-2">
                                                {s.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground/70 mt-1.5 sm:hidden">
                                                {s.user?.name} {s.user?.lastname}
                                                {" · "}
                                                {formatDate(s.createdAt)}
                                            </p>
                                        </div>

                                        <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 pt-0.5">
                                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                                                {s.user?.name} {s.user?.lastname}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground/60">
                                                {formatDate(s.createdAt)}
                                            </p>
                                        </div>

                                        <div className="shrink-0 pt-0.5 text-muted-foreground/40">
                                            {isOpen ? (
                                                <ChevronUp className="size-4" />
                                            ) : (
                                                <ChevronDown className="size-4" />
                                            )}
                                        </div>
                                    </button>

                                    {isOpen && (
                                        <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-border space-y-3">
                                            <p className="text-sm whitespace-pre-wrap leading-relaxed max-h-[180px] overflow-y-auto">
                                                {s.description}
                                            </p>

                                            {s.image && (
                                                <a
                                                    href={s.image}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-primary hover:underline"
                                                >
                                                    <ExternalLink className="size-3.5" />
                                                    Ver captura
                                                </a>
                                            )}

                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-1">
                                                <span className="text-xs text-muted-foreground">
                                                    Cambiar estado:
                                                </span>
                                                <Select
                                                    value={s.status}
                                                    onValueChange={(v) =>
                                                        handleStatusChange(s.id, v as SuggestionStatus)
                                                    }
                                                >
                                                    <SelectTrigger className="w-full sm:w-40 h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                                            <SelectItem key={k} value={k}>{v}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {meta.totalPages > 1 && (
                            <div className="pt-6 pb-2">
                                <MangaPagination
                                    page={meta.page}
                                    totalPages={meta.totalPages}
                                    setPage={(p) => updateFilter("page", String(p))}
                                />
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

function sortSuggestions(list: Suggestion[], sortBy: SortBy): Suggestion[] {
    const copy = [...list];
    switch (sortBy) {
        case "antiguo":
            return copy.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case "tipo":
            return copy.sort((a, b) => a.type.localeCompare(b.type));
        case "estado":
            return copy.sort((a, b) => a.status.localeCompare(b.status));
        default:
            return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
}
