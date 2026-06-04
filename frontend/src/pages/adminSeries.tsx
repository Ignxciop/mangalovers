import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    getAdminSeries,
    adminCreateSeriesRelation,
    adminDeleteSeriesRelation,
} from "@/api/admin";
import type { AdminSeriesItem, AdminSeriesRelation } from "@/types/admin";
import { SEO } from "@/components/seo";
import { AdminHeader } from "@/components/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
    BookOpen, Search, X, Link2, Check,
    AlertCircle, ChevronLeft, ChevronRight,
} from "lucide-react";

const PROVIDER_COLORS: Record<string, string> = {
    olympus: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    manhwaweb: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
};

function SearchableSelect({ value, onChange, placeholder, excludeId, label }: {
    value: number | null;
    onChange: (id: number | null) => void;
    placeholder: string;
    excludeId: number | null;
    label: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<AdminSeriesItem[]>([]);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchResults = useCallback(async (q: string) => {
        setLoading(true);
        try {
            const res = await getAdminSeries({ search: q || undefined, limit: 50 });
            setResults(res.data);
        } catch (err) {
            console.error("Error al buscar series:", err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchResults("");
    }, [fetchResults]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchResults(query), 250);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query, fetchResults]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = results.filter((s) => s.id !== excludeId);
    const selected = results.find((s) => s.id === value);
    const isBrand = label === "Primaria";

    return (
        <div ref={ref} className="relative">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
            {value && selected ? (
                <div
                    className={cn(
                        "flex items-center gap-2 w-full rounded-lg border-2 px-3 py-2 text-sm cursor-pointer",
                        isBrand
                            ? "border-brand/40 bg-brand/5 text-brand"
                            : "border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400",
                    )}
                    onClick={() => setOpen(true)}
                >
                    <Check className={cn("size-4 shrink-0", isBrand ? "text-brand" : "text-amber-500")} />
                    <span className="flex-1 truncate font-medium">{selected.name}</span>
                    <span className="text-xs opacity-60 shrink-0">#{selected.id}</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onChange(null); }}
                        className="hover:opacity-70 shrink-0"
                    >
                        <X className="size-3.5" />
                    </button>
                </div>
            ) : (
                <div
                    className={cn(
                        "flex items-center w-full rounded-lg border bg-background px-3 py-2 text-sm cursor-text",
                        open ? "border-ring" : "border-border",
                    )}
                    onClick={() => setOpen(true)}
                >
                    <input
                        className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                        placeholder={placeholder}
                        value={open ? query : ""}
                        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                    />
                </div>
            )}
            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-md max-h-60 overflow-y-auto">
                    {loading ? (
                        <div className="px-3 py-4 text-center text-xs text-muted-foreground">Buscando...</div>
                    ) : filtered.length === 0 ? (
                        <div className="px-3 py-4 text-center text-xs text-muted-foreground">Sin resultados</div>
                    ) : (
                        filtered.map((s) => (
                            <button
                                key={s.id}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                                    value === s.id && "bg-accent",
                                )}
                                onClick={() => { onChange(s.id); setOpen(false); setQuery(""); }}
                            >
                                <span className="flex-1 truncate">{s.name}</span>
                                <span className="text-xs text-muted-foreground shrink-0">#{s.id}</span>
                                {value === s.id && <Check className="size-3.5 text-brand shrink-0" />}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

function RelationDialog({ open, onClose, onCreated }: {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}) {
    const [primaryId, setPrimaryId] = useState<number | null>(null);
    const [fallbackId, setFallbackId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!primaryId || !fallbackId) return;
        setLoading(true);
        setError(null);
        try {
            await adminCreateSeriesRelation(primaryId, fallbackId);
            onCreated();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al crear la relación");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Vincular series</DialogTitle>
                    <DialogDescription>
                        La serie primaria es la principal; la fallback se usará cuando la primaria no tenga datos (capítulos extra, cover, páginas).
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                    <SearchableSelect
                        value={primaryId}
                        onChange={setPrimaryId}
                        placeholder="Buscar primaria..."
                        excludeId={fallbackId}
                        label="Primaria"
                    />
                    <SearchableSelect
                        value={fallbackId}
                        onChange={setFallbackId}
                        placeholder="Buscar fallback..."
                        excludeId={primaryId}
                        label="Fallback"
                    />
                </div>
                {error && <p className="text-xs text-rose-500">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button
                        onClick={handleCreate}
                        disabled={!primaryId || !fallbackId || primaryId === fallbackId || loading}
                    >
                        {loading ? "Creando..." : "Vincular"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function AdminSeries() {
    const navigate = useNavigate();
    const [data, setData] = useState<AdminSeriesItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [provider, setProvider] = useState("");
    const [showRelation, setShowRelation] = useState(false);

    const limit = 15;

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAdminSeries({ page, limit, search: search || undefined, provider: provider || undefined });
            setData(res.data);
            setTotal(res.total);
        } catch {
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [page, search, provider]);

    useEffect(() => { fetch(); }, [fetch]);

    const totalPages = Math.ceil(total / limit);

    const handleDeleteRelation = async (id: number) => {
        if (!window.confirm("¿Eliminar esta relación entre series?")) return;
        try {
            await adminDeleteSeriesRelation(id);
            fetch();
        } catch (err) {
            console.error("Error al eliminar relación:", err);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <SEO title="Administrar Series" />

            <AdminHeader icon={BookOpen} title="Series" />

            <main className="container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0 overflow-x-hidden">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            className="pl-9"
                            placeholder="Buscar por nombre..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <select
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        value={provider}
                        onChange={(e) => { setProvider(e.target.value); setPage(1); }}
                    >
                        <option value="">Todos los providers</option>
                        <option value="olympus">Olympus</option>
                        <option value="manhwaweb">Manhwaweb</option>
                    </select>
                    <Button variant="outline" onClick={() => setShowRelation(true)}>
                        <Link2 className="size-4" /> Vincular
                    </Button>
                </div>

                {loading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 15 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 rounded-lg" />
                        ))}
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                        <AlertCircle className="size-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">No se encontraron series</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="border border-border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/20">
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Providers</th>
                                        <th className="text-center px-4 py-3 font-medium text-muted-foreground">Caps</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Relaciones</th>
                                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((s) => (
                                        <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                                            <td className="px-4 py-3 text-muted-foreground tabular-nums">#{s.id}</td>
                                            <td className="px-4 py-3 font-medium truncate max-w-[300px]">{s.name}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1 flex-wrap">
                                                    {s.providerSeries.map((ps) => (
                                                        <span key={ps.slug} className={cn(
                                                            "text-xs px-2 py-0.5 rounded-full border font-medium inline-flex items-center gap-1",
                                                            PROVIDER_COLORS[ps.provider.name] ?? "bg-muted/50 text-muted-foreground border-border",
                                                        )}>
                                                            {ps.provider.name}
                                                            <span className="opacity-60">#{ps.provider.priority}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{s._count.chapters}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1 flex-wrap items-center">
                                                    {s.primaryRelations.map((rel: AdminSeriesRelation) => (
                                                        <span key={rel.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                                            <Link2 className="size-3" />
                                                            {rel.fallbackSeries.name}
                                                            <button type="button" onClick={() => handleDeleteRelation(rel.id)} className="hover:text-rose-500 ml-0.5">
                                                                <X className="size-3" />
                                                            </button>
                                                        </span>
                                                    ))}
                                                    {s.fallbackRelations.map((rel) => (
                                                        <span key={rel.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/30">
                                                            <Link2 className="size-3" />
                                                            {rel.primarySeries.name}
                                                            <span className="opacity-60 text-xs">(primaria)</span>
                                                            <button type="button" onClick={() => handleDeleteRelation(rel.id)} className="hover:text-rose-500 ml-0.5">
                                                                <X className="size-3" />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button variant="link" size="sm" onClick={() => navigate(`/admin/series/${s.id}`)}>
                                                    Detalle
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-3 mt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft className="size-4" /> Anterior
                                </Button>
                                <span className="text-sm text-muted-foreground tabular-nums">
                                    Página {page} de {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    Siguiente <ChevronRight className="size-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <RelationDialog open={showRelation} onClose={() => setShowRelation(false)} onCreated={fetch} />
        </div>
    );
}
