import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAdminSeriesDetail, adminAddAlias, adminDeleteAlias, adminDeleteSeriesRelation } from "@/api/admin";
import type { AdminSeriesDetail } from "@/types/admin";
import { SEO } from "@/components/seo";
import { AdminHeader } from "@/components/AdminHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, ChevronLeft, Link2, X, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminSeriesDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [series, setSeries] = useState<AdminSeriesDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [newAlias, setNewAlias] = useState("");

    const fetch = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await getAdminSeriesDetail(Number(id));
            setSeries(res.data);
        } catch {
            setSeries(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetch(); }, [id]);

    const handleAddAlias = async () => {
        if (!newAlias.trim() || !series) return;
        try {
            await adminAddAlias(series.id, newAlias.trim());
            setNewAlias("");
            fetch();
        } catch { }
    };

    const handleDeleteAlias = async (aliasId: number) => {
        if (!series) return;
        try {
            await adminDeleteAlias(series.id, aliasId);
            fetch();
        } catch { }
    };

    const handleDeleteRelation = async (relationId: number) => {
        if (!window.confirm("¿Eliminar esta relación?")) return;
        try {
            await adminDeleteSeriesRelation(relationId);
            fetch();
        } catch { }
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
                <button
                    onClick={() => navigate("/admin/series")}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group shrink-0"
                >
                    <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                    Volver
                </button>
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
                                    <div key={ps.slug} className="flex items-center gap-3 text-sm">
                                        <span className={cn(
                                            "text-[10px] px-2 py-0.5 rounded-full border font-medium",
                                            ps.provider.name === "olympus"
                                                ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30"
                                                : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
                                        )}>
                                            {ps.provider.name}
                                        </span>
                                        <span className="font-mono text-xs text-muted-foreground">{ps.externalId}</span>
                                        <span className="text-muted-foreground">→</span>
                                        <span className="font-mono text-xs">{ps.slug}</span>
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
                                            <button onClick={() => handleDeleteAlias(a.id)} className="hover:text-rose-500">
                                                <X className="size-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                                    placeholder="Nuevo alias..."
                                    value={newAlias}
                                    onChange={(e) => setNewAlias(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleAddAlias(); }}
                                />
                                <button
                                    onClick={handleAddAlias}
                                    disabled={!newAlias.trim()}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-brand text-white hover:opacity-90 disabled:opacity-50"
                                >
                                    <Plus className="size-4" /> Agregar
                                </button>
                            </div>
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
                                            <button onClick={() => handleDeleteRelation(rel.id)} className="text-muted-foreground hover:text-rose-500">
                                                <Trash2 className="size-3.5" />
                                            </button>
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
                                            <button onClick={() => handleDeleteRelation(rel.id)} className="text-muted-foreground hover:text-rose-500">
                                                <Trash2 className="size-3.5" />
                                            </button>
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
