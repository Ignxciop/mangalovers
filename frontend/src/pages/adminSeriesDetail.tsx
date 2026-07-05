import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    getAdminSeriesDetail, adminAddAlias, adminDeleteAlias, adminDeleteSeriesRelation,
    adminToggleSeriesVisibility, getSeriesChapters, bulkDeleteChapters, toggleProviderSeries,
    fullScrapeSeries,
} from "@/api/admin";
import type { AdminSeriesDetail, AdminChapter } from "@/types/admin";
import { SEO } from "@/components/seo";
import { AdminHeader } from "@/components/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { useQueryCache } from "@/store/queryCache";
import { MangaPagination } from "@/components/MangaPagination";
import {
    BookOpen, ChevronLeft, Link2, X, Plus, Trash2, Eye, EyeOff,
    Loader2, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";

export default function AdminSeriesDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const returnSearch = window.location.search;
    const [series, setSeries] = useState<AdminSeriesDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [newAlias, setNewAlias] = useState("");

    const fetch = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await getAdminSeriesDetail(Number(id));
            setSeries(res.data);
        } catch (err) {
            console.error("Error al cargar serie:", err);
            setSeries(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetch(); }, [fetch]);

    const handleAddAlias = async () => {
        if (!newAlias.trim() || !series) return;
        try {
            await adminAddAlias(series.id, newAlias.trim());
            setNewAlias("");
            fetch();
        } catch (err) {
            console.error("Error al agregar alias:", err);
        }
    };

    const handleDeleteAlias = async (aliasId: number) => {
        if (!series) return;
        try {
            await adminDeleteAlias(series.id, aliasId);
            fetch();
        } catch (err) {
            console.error("Error al eliminar alias:", err);
        }
    };

    const [toggling, setToggling] = useState(false);
    const invalidateSeriesCache = () => useQueryCache.getState().invalidate("series-detail");

    const [chapters, setChapters] = useState<AdminChapter[]>([]);
    const [chaptersLoading, setChaptersLoading] = useState(false);
    const [chapterPage, setChapterPage] = useState(1);
    const [chapterTotalPages, setChapterTotalPages] = useState(1);
    const [chapterTotal, setChapterTotal] = useState(0);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [deleting, setDeleting] = useState(false);
    const [togglingPs, setTogglingPs] = useState<Record<number, boolean>>({});
    const chapterOrderRef = useRef<"asc" | "desc">("desc");
    const [chapterOrder, setChapterOrder] = useState<"asc" | "desc">("desc");

    const fetchChapters = useCallback(async (page = 1, order?: "asc" | "desc") => {
        if (!id) return;
        setChaptersLoading(true);
        try {
            const ord = order ?? chapterOrderRef.current;
            const res = await getSeriesChapters(Number(id), page, 20, ord);
            setChapters(res.chapters);
            setChapterPage(res.page);
            setChapterTotalPages(res.totalPages);
            setChapterTotal(res.total);
            setSelectedIds(new Set());
        } catch (err) {
            console.error("Error al cargar capítulos:", err);
            setChapters([]);
        } finally {
            setChaptersLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchChapters(); }, [fetchChapters]);

    const handleOrderToggle = () => {
        const next = chapterOrder === "desc" ? "asc" : "desc";
        chapterOrderRef.current = next;
        setChapterOrder(next);
        fetchChapters(1, next);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === chapters.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(chapters.map((c) => c.id)));
        }
    };

    const toggleSelect = (chapterId: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(chapterId)) {
                next.delete(chapterId);
            } else {
                next.add(chapterId);
            }
            return next;
        });
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`¿Eliminar ${selectedIds.size} capítulo(s) permanentemente?`)) return;
        setDeleting(true);
        try {
            const res = await bulkDeleteChapters(Array.from(selectedIds));
            toast.success(`${res.data.deleted} capítulo(s) eliminado(s)`);
            invalidateSeriesCache();
            fetchChapters(1);
            fetch();
        } catch (e) {
            const err = e as AxiosError<{ message: string }>;
            toast.error(err.response?.data?.message ?? "Error al eliminar capítulos");
        } finally {
            setDeleting(false);
        }
    };

    const handleToggleProvider = async (psId: number) => {
        if (!series) return;
        setTogglingPs((prev) => ({ ...prev, [psId]: true }));
        try {
            const res = await toggleProviderSeries(series.id, psId);
            setSeries((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    providerSeries: prev.providerSeries.map((ps) =>
                        ps.id === psId ? { ...ps, enabled: res.data.enabled } : ps
                    ),
                };
            });
            invalidateSeriesCache();
            toast.success(`Provider ${res.data.enabled ? "activado" : "desactivado"}`);
        } catch (e) {
            const err = e as AxiosError<{ message: string }>;
            toast.error(err.response?.data?.message ?? "Error al cambiar estado del provider");
        } finally {
            setTogglingPs((prev) => ({ ...prev, [psId]: false }));
        }
    };

    const handleToggleVisibility = async () => {
        if (!series) return;
        setToggling(true);
        try {
            const res = await adminToggleSeriesVisibility(series.id);
            setSeries((prev) => prev ? { ...prev, visible: res.data.visible } : null);
        } catch (err) {
            console.error("Error al cambiar visibilidad:", err);
        } finally {
            setToggling(false);
        }
    };

    const [scrapingPs, setScrapingPs] = useState<Record<number, boolean>>({});

    const handleScrapeSeries = async (psId: number, providerName: string) => {
        if (!series) return;
        setScrapingPs((prev) => ({ ...prev, [psId]: true }));
        try {
            const res = await fullScrapeSeries(series.id, providerName);
            const d = res.data;
            const parts = [];
            if (d.newChapters > 0) parts.push(`${d.newChapters} nuevo(s)`);
            if (d.refilledChapters > 0) parts.push(`${d.refilledChapters} re-scrapeado(s)`);
            if (parts.length === 0) parts.push("sin cambios");
            toast.success(`Scrapeo de "${providerName}" completado: ${parts.join(", ")}`);
            if (d.errors && d.errors.length > 0) {
                toast.warning(`${d.errors.length} error(es) en capítulos`, {
                    description: d.errors.map((e) => `${e.externalId}: ${e.error}`).join(". "),
                });
            }
            fetch();
        } catch {
            toast.error("Error al scrapear la serie");
        } finally {
            setScrapingPs((prev) => ({ ...prev, [psId]: false }));
        }
    };

    const handleDeleteRelation = async (relationId: number) => {
        if (!window.confirm("¿Eliminar esta relación?")) return;
        try {
            await adminDeleteSeriesRelation(relationId);
            fetch();
        } catch (err) {
            console.error("Error al eliminar relación:", err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <AdminHeader icon={BookOpen} title="Cargando..." />
                <main className="container mx-auto px-4 py-4 flex-1">
                    <Skeleton className="h-8 w-48 mb-4" />
                    <Skeleton className="h-64 rounded-lg" />
                </main>
            </div>
        );
    }

    if (!series) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <AdminHeader icon={BookOpen} title="Serie no encontrada" />
                <main className="container mx-auto px-4 py-4 flex-1">
                    <p className="text-muted-foreground">No se encontró la serie solicitada.</p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <SEO title={series.name} />

            <AdminHeader icon={BookOpen} title={series.name}>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/series${returnSearch}`)}>
                    <ChevronLeft className="h-4 w-4" />
                    Volver
                </Button>
            </AdminHeader>

            <main className="container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0 overflow-x-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Columna principal */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Info básica */}
                        <div className="border border-border rounded-xl p-5 space-y-3">
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Información</h2>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">ID</span>
                                    <p className="font-mono tabular-nums">#{series.id}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Slug</span>
                                    <p className="font-mono text-xs">{series.slug}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Estado</span>
                                    <p>{series.status ?? "—"}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Tipo</span>
                                    <p>{series.type ?? "—"}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Capítulos</span>
                                    <p className="tabular-nums">{series.chapterCount}</p>
                                </div>
                            </div>
                            {series.summary && (
                                <div>
                                    <span className="text-muted-foreground text-sm">Sinopsis</span>
                                    <p className="text-sm mt-1 text-muted-foreground/80 leading-relaxed">{series.summary}</p>
                                </div>
                            )}
                        </div>

                        {/* Providers */}
                        <div className="border border-border rounded-xl p-5 space-y-3">
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Providers</h2>
                            <div className="space-y-2">
                                {series.providerSeries.map((ps) => (
                                    <div key={ps.id} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className={cn(
                                                "text-xs px-2 py-0.5 rounded-full border font-medium inline-flex items-center gap-1 shrink-0",
                                                ps.provider.name === "olympus"
                                                    ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30"
                                                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
                                                !ps.enabled && "opacity-50",
                                            )}>
                                                {ps.provider.name}
                                                <span className="opacity-60">#{ps.provider.priority}</span>
                                            </span>
                                            <span className="font-mono text-xs text-muted-foreground truncate">{ps.externalId}</span>
                                            <span className="text-muted-foreground shrink-0">→</span>
                                            <span className="font-mono text-xs truncate">{ps.slug}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleScrapeSeries(ps.id, ps.provider.name)}
                                                disabled={scrapingPs[ps.id]}
                                                className="h-8 text-xs"
                                            >
                                                {scrapingPs[ps.id] ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                                                {scrapingPs[ps.id] ? "Scrapeando..." : "Scrapear"}
                                            </Button>
                                            <span className="text-xs text-muted-foreground">
                                                {ps.enabled ? "Activo" : "Inactivo"}
                                            </span>
                                            <Switch
                                                checked={ps.enabled}
                                                disabled={togglingPs[ps.id]}
                                                onCheckedChange={() => handleToggleProvider(ps.id)}
                                                aria-label={`Toggle ${ps.provider.name}`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Aliases */}
                        <div className="border border-border rounded-xl p-5 space-y-3">
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Aliases</h2>
                            {series.aliases.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Sin alias registrados.</p>
                            ) : (
                                <div className="flex gap-2 flex-wrap">
                                    {series.aliases.map((a) => (
                                        <span key={a.id} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-muted/50 border border-border">
                                            {a.alias}
                                            <Button variant="ghost" size="icon-xs" onClick={() => handleDeleteAlias(a.id)}>
                                                <X className="size-3" />
                                            </Button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Nuevo alias..."
                                    value={newAlias}
                                    onChange={(e) => setNewAlias(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleAddAlias(); }}
                                />
                                <Button onClick={handleAddAlias} disabled={!newAlias.trim()}>
                                    <Plus className="size-4" /> Agregar
                                </Button>
                            </div>
                        </div>
                        {/* Capítulos */}
                        <div className="border border-border rounded-xl p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                    Capítulos
                                    <span className="ml-2 font-mono text-xs font-normal opacity-60">({chapterTotal})</span>
                                </h2>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleOrderToggle}
                                        className="text-xs text-muted-foreground"
                                    >
                                        {chapterOrder === "desc" ? "↓ Últimos" : "↑ Primeros"}
                                    </Button>
                                    {chapters.length > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={toggleSelectAll}
                                        >
                                            {selectedIds.size === chapters.length ? "Deseleccionar" : "Seleccionar"}
                                        </Button>
                                    )}
                                    {selectedIds.size > 0 && (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={handleBulkDelete}
                                            disabled={deleting}
                                        >
                                            {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                                            {selectedIds.size}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {chaptersLoading ? (
                                <div className="space-y-2">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Skeleton key={i} className="h-10 rounded-lg" />
                                    ))}
                                </div>
                            ) : chapters.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Sin capítulos registrados.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-10">
                                                <Checkbox
                                                    checked={chapters.length > 0 && selectedIds.size === chapters.length}
                                                    onCheckedChange={toggleSelectAll}
                                                    aria-label="Seleccionar todos"
                                                />
                                            </TableHead>
                                            <TableHead className="w-14 text-muted-foreground font-mono text-xs tabular-nums">#</TableHead>
                                            <TableHead className="text-muted-foreground">Nombre</TableHead>
                                            <TableHead className="text-muted-foreground">Provider</TableHead>
                                            <TableHead className="w-14 text-right text-muted-foreground">Págs</TableHead>
                                            <TableHead className="w-24 text-muted-foreground">Fecha</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {chapters.map((ch) => (
                                            <TableRow
                                                key={ch.id}
                                                data-state={selectedIds.has(ch.id) ? "selected" : undefined}
                                                className={selectedIds.has(ch.id) ? "bg-primary/10" : undefined}
                                            >
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedIds.has(ch.id)}
                                                        onCheckedChange={() => toggleSelect(ch.id)}
                                                        aria-label={`Seleccionar capítulo ${ch.number ?? ch.name}`}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                                                    #{ch.number ?? "?"}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="truncate block max-w-[300px]">{ch.name || "—"}</span>
                                                </TableCell>
                                                <TableCell>
                                                    {ch.providers.length === 0 ? (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-muted/50 text-muted-foreground">
                                                            —
                                                        </span>
                                                    ) : (
                                                        <div className="flex gap-1">
                                                            {ch.providers.map((p) => (
                                                                <span
                                                                    key={p}
                                                                    className={cn(
                                                                        "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                                                        p === "olympus"
                                                                            ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                                                                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                                                                    )}
                                                                >
                                                                    {p}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className={cn(
                                                    "text-right font-mono text-xs tabular-nums",
                                                    ch.pagesScraped ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
                                                )}>
                                                    {ch.pagesCount}p
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {ch.publishedAt ? new Date(ch.publishedAt).toLocaleDateString() : "—"}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}

                            {/* Paginación */}
                            {chapterTotalPages > 1 && (
                                <div className="pt-2">
                                    <MangaPagination
                                        page={chapterPage}
                                        totalPages={chapterTotalPages}
                                        setPage={(p) => fetchChapters(p, chapterOrder)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Columna lateral */}
                    <div className="space-y-6">
                        {/* Cover */}
                        <div className="border border-border rounded-xl overflow-hidden">
                            {series.cover ? (
                                <img src={series.cover} alt={series.name} className="w-full aspect-[3/4] object-cover" />
                            ) : (
                                <div className="w-full aspect-[3/4] bg-muted/30 flex items-center justify-center">
                                    <BookOpen className="size-12 text-muted-foreground/20" />
                                </div>
                            )}
                        </div>

                        {/* Visibilidad */}
                        <div className="border border-border rounded-xl p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Visibilidad</h2>
                                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                                        {series.visible
                                            ? "Visible en listados públicos"
                                            : "Oculta del público, solo admins"}
                                    </p>
                                </div>
                                <Button
                                    variant={series.visible ? "default" : "secondary"}
                                    size="sm"
                                    onClick={handleToggleVisibility}
                                    disabled={toggling}
                                >
                                    {series.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                                    {series.visible ? "Visible" : "Oculta"}
                                </Button>
                            </div>
                        </div>

                        {/* Relaciones primarias */}
                        <div className="border border-border rounded-xl p-5 space-y-3">
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Relaciones como primaria</h2>
                            {series.primaryRelations.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Sin relaciones.</p>
                            ) : (
                                <div className="space-y-2">
                                    {series.primaryRelations.map((rel) => (
                                        <div key={rel.id} className="flex items-center justify-between text-sm bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <Link2 className="size-3.5 text-emerald-500" />
                                                <span>{rel.fallbackSeries.name}</span>
                                                <span className="text-muted-foreground text-xs">#{rel.fallbackSeries.id}</span>
                                            </div>
                                            <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteRelation(rel.id)}>
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Relaciones como fallback */}
                        <div className="border border-border rounded-xl p-5 space-y-3">
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Relaciones como fallback</h2>
                            {series.fallbackRelations.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Sin relaciones.</p>
                            ) : (
                                <div className="space-y-2">
                                    {series.fallbackRelations.map((rel) => (
                                        <div key={rel.id} className="flex items-center justify-between text-sm bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <Link2 className="size-3.5 text-amber-500" />
                                                <span>{rel.primarySeries.name}</span>
                                                <span className="text-muted-foreground text-xs">#{rel.primarySeries.id}</span>
                                            </div>
                                            <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteRelation(rel.id)}>
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
