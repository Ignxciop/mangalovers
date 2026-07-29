import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { getReports, resolveReport } from "@/api/admin";
import type { CommentReport, ReportStatus } from "@/types/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { MangaPagination } from "@/components/MangaPagination";
import { FilterDrawer } from "@/components/FilterDrawer";
import { SEO } from "@/components/seo";
import { AdminHeader } from "@/components/AdminHeader";
import { cn } from "@/lib/utils";
import { Flag, CheckCircle, XCircle, Eye, Search } from "lucide-react";
import { toast } from "sonner";

const REASON_LABELS: Record<string, string> = {
    OFFENSIVE_LANGUAGE: "Lenguaje ofensivo",
    UNMARKED_SPOILER: "Spoiler sin marcar",
    OTHER: "Otro",
};

const STATUS_LABELS: Record<string, string> = {
    PENDING: "Pendiente",
    REVIEWED: "Revisado",
    DISMISSED: "Desestimado",
    RESOLVED: "Resuelto",
};

const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    REVIEWED: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    DISMISSED: "bg-muted text-muted-foreground border-border",
    RESOLVED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

const VALID_STATUSES = ["PENDING", "REVIEWED", "DISMISSED", "RESOLVED"] as const;
const VALID_REASONS = ["OFFENSIVE_LANGUAGE", "UNMARKED_SPOILER", "OTHER"] as const;

export default function AdminReports() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [reports, setReports] = useState<CommentReport[]>([]);
    const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [adminNote, setAdminNote] = useState("");
    const [showResolveDialog, setShowResolveDialog] = useState<number | null>(null);

    const statusFilter = searchParams.get("status") ?? "";
    const reasonFilter = searchParams.get("reason") ?? "";
    const page = parseInt(searchParams.get("page") || "1");

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit: 20 };
            if (statusFilter) params.status = statusFilter;
            if (reasonFilter) params.reason = reasonFilter;
            const res = await getReports(params);
            setReports(res.data);
            setMeta(res.meta);
        } catch {
            setReports([]);
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, reasonFilter]);

    useEffect(() => { fetchReports(); }, [fetchReports]);

    const updateFilter = (key: string, value: string) => {
        const next = new URLSearchParams(searchParams);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== "page") next.set("page", "1");
        setSearchParams(next);
    };

    async function handleResolve(reportId: number, status: ReportStatus) {
        try {
            await resolveReport(reportId, status, adminNote || undefined);
            toast.success("Reporte actualizado");
            setShowResolveDialog(null);
            setAdminNote("");
            fetchReports();
        } catch {
            toast.error("Error al actualizar reporte");
        }
    }

    const activeFiltersCount = [statusFilter, reasonFilter].filter(Boolean).length;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <SEO title="Reportes de comentarios" />

            <AdminHeader
                icon={Flag}
                title="Reportes"
            >
                <FilterDrawer title="Filtros" activeFiltersCount={activeFiltersCount} onClearAll={() => { const next = new URLSearchParams(searchParams); next.delete("status"); next.delete("reason"); next.set("page", "1"); setSearchParams(next); }}>
                    <div className="px-6 py-5 border-b border-border">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Estado</p>
                        <div className="flex flex-wrap gap-2">
                            {VALID_STATUSES.map((s) => (
                                <Badge
                                    key={s}
                                    variant={statusFilter === s ? "default" : "outline"}
                                    className="cursor-pointer text-xs px-3 py-1"
                                    onClick={() => updateFilter("status", statusFilter === s ? "" : s)}
                                >
                                    {STATUS_LABELS[s]}
                                </Badge>
                            ))}
                        </div>
                    </div>
                    <div className="px-6 py-5 border-b border-border">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Motivo</p>
                        <div className="flex flex-wrap gap-2">
                            {VALID_REASONS.map((r) => (
                                <Badge
                                    key={r}
                                    variant={reasonFilter === r ? "default" : "outline"}
                                    className="cursor-pointer text-xs px-3 py-1"
                                    onClick={() => updateFilter("reason", reasonFilter === r ? "" : r)}
                                >
                                    {REASON_LABELS[r]}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </FilterDrawer>
            </AdminHeader>

            <main className="container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0 overflow-x-hidden">
                {loading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-10 rounded-lg" />
                        {Array.from({ length: 15 }).map((_, i) => (
                            <Skeleton key={i} className="h-[52px] rounded-lg" />
                        ))}
                    </div>
                ) : reports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center flex-1">
                        <div className="size-14 rounded-full bg-muted/30 flex items-center justify-center">
                            <Flag className="size-7 text-muted-foreground/30" />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-base font-medium text-muted-foreground/70">
                                {statusFilter || reasonFilter ? "Sin resultados" : "Sin reportes"}
                            </p>
                            <p className="text-sm text-muted-foreground/50">
                                {statusFilter || reasonFilter ? "Prueba con otros filtros" : "Los reportes de comentarios aparecerán aquí"}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="border border-border rounded-lg overflow-hidden bg-card">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/20">
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Reportante</th>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Comentario</th>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Motivo</th>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Estado</th>
                                            <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Fecha</th>
                                            <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {reports.map((report) => (
                                            <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="text-sm">{report.reporter?.name} {report.reporter?.lastname}</span>
                                                    {report.reporter?.alias && (
                                                        <span className="text-xs text-muted-foreground/60 block">@{report.reporter.alias}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 max-w-[250px]">
                                                    <div className="space-y-1">
                                                        {report.comment?.series?.slug ? (() => {
                                                            const c = report.comment!;
                                                            const s = c.series!;
                                                            const url = c.chapterId
                                                                ? `/manga/${s.slug}/capitulo/${c.chapterId}#comment-${c.id}`
                                                                : `/manga/${s.slug}#comment-${c.id}`;
                                                            return (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        window.open(url, "_blank", "noopener,noreferrer");
                                                                    }}
                                                                    className="text-sm text-foreground/80 truncate block hover:text-primary transition-colors text-left w-full cursor-pointer"
                                                                >
                                                                    {c.content ?? "Comentario eliminado"}
                                                                </button>
                                                            );
                                                        })() : (
                                                            <p className="text-sm text-foreground/80 truncate">
                                                                {report.comment?.content ?? "Comentario eliminado"}
                                                            </p>
                                                        )}
                                                        {report.comment?.user && (
                                                            <p className="text-xs text-muted-foreground/50">
                                                                por @{report.comment.user.alias ?? "anónimo"}
                                                            </p>
                                                        )}
                                                        {(() => {
                                                            const s = report.comment?.series?.name;
                                                            const ch = report.comment?.chapter?.name;
                                                            if (ch && s) return <p className="text-xs text-muted-foreground/40">Cap. {ch} de {s}</p>;
                                                            if (s) return <p className="text-xs text-muted-foreground/40">{s}</p>;
                                                            return null;
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {REASON_LABELS[report.reason] ?? report.reason}
                                                    </Badge>
                                                    {report.description && (
                                                        <p className="text-xs text-muted-foreground/60 mt-1 truncate max-w-[150px]">
                                                            {report.description}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border", STATUS_COLORS[report.status])}>
                                                        {STATUS_LABELS[report.status]}
                                                    </span>
                                                    {report.adminNote && (
                                                        <p className="text-xs text-muted-foreground/50 mt-1 italic max-w-[160px] truncate" title={report.adminNote}>
                                                            Nota: {report.adminNote}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="text-sm text-muted-foreground/70 whitespace-nowrap">
                                                        {formatDate(report.createdAt)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {report.status === "PENDING" ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => { setShowResolveDialog(report.id); setAdminNote(""); }}
                                                            className="text-xs h-7"
                                                        >
                                                            <Search className="h-3 w-3 mr-1" />
                                                            Revisar
                                                        </Button>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground/50">
                                                            {report.resolvedBy ? `por ${report.resolvedBy.name}` : ""}
                                                        </span>
                                                    )}
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

            {showResolveDialog !== null && createPortal((() => {
                const r = reports.find((x) => x.id === showResolveDialog);
                if (!r) return null;
                const commentHref = r.comment?.series?.slug
                    ? r.comment.chapterId
                        ? `/manga/${r.comment.series.slug}/capitulo/${r.comment.chapterId}#comment-${r.comment.id}`
                        : `/manga/${r.comment.series.slug}#comment-${r.comment.id}`
                    : null;
                const loc = r.comment?.series?.name
                    ? r.comment.chapter?.name
                        ? `Cap. ${r.comment.chapter.name} de ${r.comment.series.name}`
                        : r.comment.series.name
                    : null;
                return (
                <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-brightness-[0.3]" onClick={() => setShowResolveDialog(null)}>
                    <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-border">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">Revisar reporte</h3>
                                {commentHref && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(commentHref, "_blank", "noopener,noreferrer");
                                        }}
                                        className="text-xs text-primary hover:underline shrink-0 bg-transparent border-none cursor-pointer"
                                    >
                                        Ver comentario →
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">Reportó</p>
                                    <p className="font-medium truncate">{r.reporter?.name} {r.reporter?.lastname}</p>
                                    {r.reporter?.alias && <p className="text-xs text-muted-foreground/60">@{r.reporter.alias}</p>}
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">Reportado</p>
                                    <p className="font-medium truncate">{r.comment?.user?.alias ?? "anónimo"}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Comentario</p>
                                <div className="bg-muted/20 rounded-lg p-3 text-sm text-foreground/80 leading-relaxed">
                                    {r.comment?.content ?? <span className="italic text-muted-foreground/50">Comentario eliminado</span>}
                                </div>
                                {loc && <p className="text-xs text-muted-foreground/40 mt-1">{loc}</p>}
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Motivo</p>
                                <p className="text-sm font-medium">{REASON_LABELS[r.reason] ?? r.reason}</p>
                                {r.description && <p className="text-xs text-muted-foreground/70 mt-0.5 max-h-24 overflow-y-auto break-words">{r.description}</p>}
                                <p className="text-xs text-muted-foreground/50 mt-2">{formatDate(r.createdAt)}</p>
                            </div>
                            <hr className="border-border" />
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Acción</p>
                                <div className="flex flex-col gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleResolve(showResolveDialog, "REVIEWED")}
                                        className="justify-start"
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        Marcar como revisado
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleResolve(showResolveDialog, "RESOLVED")}
                                        className="justify-start text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Resolver (tomé medidas)
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleResolve(showResolveDialog, "DISMISSED")}
                                        className="justify-start text-muted-foreground"
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Desestimar (no amerita acción)
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Nota interna <span className="text-muted-foreground/50">(opcional)</span>
                                </p>
                                <Textarea
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    placeholder="Nota para registro interno..."
                                    className="min-h-[60px] resize-none text-sm"
                                    maxLength={500}
                                />
                            </div>
                        </div>
                        <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setShowResolveDialog(null)}>
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </div>
            );
            })(), document.body)}
        </div>
    );
}
