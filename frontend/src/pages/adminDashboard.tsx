import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMetricsOverview } from "@/api/admin";
import type { OverviewMetrics } from "@/types/admin";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SEO } from "@/components/seo";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
    Users, BookOpen, FileText, Lightbulb, Activity, UserPlus,
    CheckCircle2, AlertCircle, Clock, ArrowRight,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
    OPEN: "Abiertas",
    REVIEWING: "Revisando",
    RESOLVED: "Resueltas",
    REJECTED: "Rechazadas",
    CLOSED: "Cerradas",
};

function StatCard({ icon: Icon, label, value, sub, accent }: {
    icon: React.ElementType;
    label: string;
    value: number | string;
    sub?: string;
    accent: "primary" | "emerald" | "amber" | "sky" | "rose" | "violet";
}) {
    const accentBorder = {
        primary: "border-brand/30",
        emerald: "border-emerald-500/30 dark:border-emerald-500/20",
        amber: "border-amber-500/30 dark:border-amber-500/20",
        sky: "border-sky-500/30 dark:border-sky-500/20",
        rose: "border-rose-500/30 dark:border-rose-500/20",
        violet: "border-violet-500/30 dark:border-violet-500/20",
    };
    const accentIcon = {
        primary: "bg-brand/15 text-brand",
        emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        sky: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
        rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
        violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    };
    return (
        <div className={cn("rounded-xl border bg-card p-4 flex items-start gap-3", accentBorder[accent])}>
            <div className={cn("flex items-center justify-center size-9 rounded-lg shrink-0", accentIcon[accent])}>
                <Icon className="size-4" />
            </div>
            <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground mb-0.5 leading-none">{label}</p>
                <p className="text-xl font-bold leading-none tracking-tight tabular-nums">{value}</p>
                {sub && <p className="text-[10px] text-muted-foreground/60 mt-1">{sub}</p>}
            </div>
        </div>
    );
}

function MiniSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="border border-border rounded-md">
            <div className="px-3 py-2 border-b border-border bg-muted/20">
                <span className="text-[11px] font-medium text-muted-foreground">{title}</span>
            </div>
            <div className="p-3">{children}</div>
        </div>
    );
}

function Elapsed({ finishedAt }: { finishedAt: string | null }) {
    const [now, setNow] = useState<number | null>(null);
    useEffect(() => {
        const tick = () => setNow(Date.now());
        tick();
        const id = setInterval(tick, 60000);
        return () => clearInterval(id);
    }, []);
    if (!finishedAt) return "en ejecución...";
    if (now === null) return "...";
    const diff = now - new Date(finishedAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins} min`;
    return `hace ${Math.floor(mins / 60)}h ${mins % 60}min`;
}

function ScraperStatus({ scraper }: { scraper: OverviewMetrics["scraper"] }) {
    if (!scraper) {
        return (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                Sin ejecuciones registradas
            </div>
        );
    }

    const isOk = scraper.status === "success";

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {isOk ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : (
                        <AlertCircle className="size-4 text-rose-500" />
                    )}
                    <span className={cn(
                        "text-xs font-medium",
                        isOk ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                    )}>
                        {isOk ? "Operativo" : "Falló"}
                    </span>
                </div>
                    <span className="text-[10px] text-muted-foreground"><Elapsed finishedAt={scraper.finishedAt} /></span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                <span>Series: {scraper.seriesProcessed}</span>
                <span>Capítulos: {scraper.chaptersCreated}</span>
                <span>Páginas: {scraper.pagesScraped}</span>
                <span>Errores: {scraper.errors}</span>
            </div>
            {scraper.errorMessage && (
                <p className="text-[10px] text-rose-500/70 break-words">{scraper.errorMessage}</p>
            )}
        </div>
    );
}

function SuggestionBar({ status, count, total }: { status: string; count: number; total: number }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const barColor = {
        OPEN: "bg-amber-500",
        REVIEWING: "bg-blue-500",
        RESOLVED: "bg-emerald-500",
        REJECTED: "bg-muted-foreground/30",
        CLOSED: "bg-muted-foreground/50",
    };
    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-16 shrink-0">{STATUS_LABELS[status] ?? status}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", barColor[status as keyof typeof barColor] ?? "bg-muted-foreground/30")} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground w-6 text-right tabular-nums">{count}</span>
        </div>
    );
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getMetricsOverview()
            .then((res) => setMetrics(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const quickLinks = [
        { label: "Usuarios", path: "/admin/usuarios", icon: Users, accent: "sky" as const },
        { label: "Sugerencias", path: "/admin/sugerencias", icon: Lightbulb, accent: "amber" as const },
        { label: "Actividad", path: "/admin/logs", icon: Activity, accent: "violet" as const },
        { label: "Métricas", path: "/admin/metricas", icon: FileText, accent: "primary" as const },
    ];

    return (
        <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
            <SEO title="Panel de Administración" />

            <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border">
                <div className="container mx-auto grid grid-cols-[auto_1fr] items-center h-14 px-4">
                    <SidebarTrigger />
                    <div className="flex justify-center min-w-0">
                        <span className="text-xs font-medium text-muted-foreground">Panel de Administración</span>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0">
                {loading ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-24 rounded-xl" />
                            ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Skeleton className="h-40 rounded-xl" />
                            <Skeleton className="h-40 rounded-xl" />
                        </div>
                    </div>
                ) : !metrics ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                        <AlertCircle className="size-8 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">No se pudieron cargar las métricas</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <StatCard icon={Users} label="Usuarios" value={metrics.users.total.toLocaleString()} sub={`${metrics.users.admins} admins`} accent="primary" />
                            <StatCard icon={BookOpen} label="Series" value={metrics.content.series.toLocaleString()} sub={`${metrics.content.updatedToday} actualizadas hoy`} accent="emerald" />
                            <StatCard icon={FileText} label="Capítulos" value={metrics.content.chapters.toLocaleString()} sub={`${metrics.content.chaptersToday} nuevos hoy`} accent="sky" />
                            <StatCard icon={Lightbulb} label="Sugerencias" value={metrics.suggestions.total} sub={`${metrics.suggestions.open} abiertas`} accent="amber" />
                            <StatCard icon={Activity} label="Activos hoy" value={metrics.users.activeToday} sub={`${metrics.users.activeWeek} esta semana`} accent="rose" />
                            <StatCard icon={UserPlus} label="Nuevos hoy" value={metrics.users.newToday} sub={`${metrics.users.newWeek} esta semana`} accent="violet" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <MiniSection title="Última ejecución del scraper">
                                <ScraperStatus scraper={metrics.scraper} />
                            </MiniSection>

                            <MiniSection title="Sugerencias por estado">
                                <div className="space-y-1.5">
                                    {Object.entries(metrics.suggestions.byStatus).map(([status, count]) => (
                                        <SuggestionBar key={status} status={status} count={count} total={metrics.suggestions.total} />
                                    ))}
                                </div>
                            </MiniSection>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {quickLinks.map((link) => (
                                <button
                                    key={link.path}
                                    onClick={() => navigate(link.path)}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-lg border border-border",
                                        "hover:bg-muted/50 transition-colors text-left",
                                    )}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className={cn(
                                            "flex items-center justify-center size-7 rounded-md",
                                            link.accent === "sky" && "bg-sky-500/15 text-sky-600 dark:text-sky-400",
                                            link.accent === "amber" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                                            link.accent === "violet" && "bg-violet-500/15 text-violet-600 dark:text-violet-400",
                                            link.accent === "primary" && "bg-brand/15 text-brand",
                                        )}>
                                            <link.icon className="size-3.5" />
                                        </div>
                                        <span className="text-xs font-medium">{link.label}</span>
                                    </div>
                                    <ArrowRight className="size-3 text-muted-foreground" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
