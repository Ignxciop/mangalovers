import { useEffect, useState } from "react";
import { getScraperMetrics, getUserMetrics, getContentMetrics, getSystemMetrics } from "@/api/admin";
import type { ScraperMetricsData, UserMetricsData, ContentMetricsData, SystemMetricsData } from "@/types/admin";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SEO } from "@/components/seo";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
    BarChart3, Server, Users, BookOpen, Activity,
    CheckCircle2, AlertCircle, XCircle, Clock, Zap,
    Flame, TrendingUp, FileText, Tag,
} from "lucide-react";

type Tab = "scrapers" | "usuarios" | "contenido" | "sistema";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "scrapers", label: "Scrapers", icon: Server },
    { id: "usuarios", label: "Usuarios", icon: Users },
    { id: "contenido", label: "Contenido", icon: BookOpen },
    { id: "sistema", label: "Sistema", icon: Activity },
];

function MiniCard({ icon: Icon, label, value, sub, accent }: {
    icon: React.ElementType; label: string; value: string | number; sub?: string;
    accent: "emerald" | "amber" | "sky" | "rose" | "violet" | "primary";
}) {
    const iconBg = {
        primary: "bg-brand/15 text-brand",
        emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        sky: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
        rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
        violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    };
    return (
        <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
            <div className={cn("flex items-center justify-center size-9 rounded-lg shrink-0", iconBg[accent])}>
                <Icon className="size-4" />
            </div>
            <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground mb-0.5 leading-none">{label}</p>
                <p className="text-lg font-bold leading-none tracking-tight tabular-nums">{value}</p>
                {sub && <p className="text-[10px] text-muted-foreground/60 mt-1">{sub}</p>}
            </div>
        </div>
    );
}

function SectionHeader({ icon: Icon, title, color = "brand" }: { icon: React.ElementType; title: string; color?: string }) {
    const colorMap: Record<string, string> = {
        brand: "bg-brand/15 text-brand",
        sky: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
        amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    };
    return (
        <div className="flex items-center gap-2 mb-3">
            <span className={cn("flex items-center justify-center size-6 rounded-md shrink-0", colorMap[color] ?? colorMap.brand)}>
                <Icon className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-xs font-semibold tracking-wide">{title}</h2>
        </div>
    );
}

function BarChart({ data, getLabel, getValue, accent = "brand" }: {
    data: unknown[];
    getLabel: (d: unknown) => string;
    getValue: (d: unknown) => number;
    accent?: string;
}) {
    const max = Math.max(...data.map(getValue), 1);
    const accentGrad = accent === "brand" ? "from-brand to-brand-cyan" : "from-sky-500 to-brand-cyan";

    return (
        <div className="flex items-end gap-1.5 h-28">
            {data.map((d, i) => {
                const val = getValue(d);
                const label = getLabel(d);
                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] text-muted-foreground font-medium">{val > 0 ? val : ""}</span>
                        <div className="w-full relative flex items-end" style={{ height: "80px" }}>
                            <div
                                className={cn("w-full rounded-t-sm transition-all duration-500 bg-gradient-to-t", accentGrad)}
                                style={{ height: `${(val / max) * 80}px`, minHeight: val > 0 ? "3px" : "0" }}
                            />
                        </div>
                        <span className="text-[8px] text-muted-foreground truncate w-full text-center">
                            {label.length > 6 ? label.slice(0, 6) + "..." : label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function HorizontalBar({ data, getLabel, getValue, accent = "brand" }: {
    data: unknown[];
    getLabel: (d: unknown) => string;
    getValue: (d: unknown) => number;
    accent?: string;
}) {
    const max = Math.max(...data.map(getValue), 1);
    const barAccent = accent === "brand" ? "bg-gradient-to-r from-brand to-brand-cyan" : "bg-gradient-to-r from-sky-500 to-brand-cyan";

    return (
        <div className="space-y-2">
            {data.map((d, i) => {
                const val = getValue(d);
                const label = getLabel(d);
                return (
                    <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-20 shrink-0 truncate">{label}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all", barAccent)} style={{ width: `${(val / max) * 100}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">{val}</span>
                    </div>
                );
            })}
        </div>
    );
}

function ScraperTab({ data }: { data: ScraperMetricsData }) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.providers.map((p) => {
                    const isOk = p.lastRun?.status === "success";
                    const hasRun = !!p.lastRun;
                    return (
                        <div key={p.id} className="rounded-xl border border-border bg-card p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    {hasRun ? (
                                        isOk
                                            ? <CheckCircle2 className="size-4 text-emerald-500" />
                                            : <XCircle className="size-4 text-rose-500" />
                                    ) : (
                                        <Clock className="size-4 text-muted-foreground" />
                                    )}
                                    <span className="text-sm font-semibold capitalize">{p.name}</span>
                                </div>
                                <span className={cn(
                                    "text-[10px] font-medium px-2 py-0.5 rounded-full",
                                    isOk ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground",
                                )}>
                                    {hasRun ? (isOk ? "Operativo" : "Falló") : "Sin datos"}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                                <span className="text-muted-foreground">Series vinculadas:</span>
                                <span className="font-medium tabular-nums text-right">{p.seriesCount}</span>
                                {hasRun && (
                                    <>
                                        <span className="text-muted-foreground">Última ejecución:</span>
                                        <span className="font-medium tabular-nums text-right">
                                            {new Date(p.lastRun!.startedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                        <span className="text-muted-foreground">Duración:</span>
                                        <span className="font-medium tabular-nums text-right">
                                            {p.lastRun!.finishedAt
                                                ? Math.round((new Date(p.lastRun!.finishedAt).getTime() - new Date(p.lastRun!.startedAt).getTime()) / 1000) + "s"
                                                : "—"}
                                        </span>
                                    </>
                                )}
                                <span className="text-muted-foreground">Ejecuciones (7d):</span>
                                <span className="font-medium tabular-nums text-right">{p.weekRuns}</span>
                                <span className="text-muted-foreground">Capítulos (7d):</span>
                                <span className="font-medium tabular-nums text-right">{p.weekChaptersCreated}</span>
                                <span className="text-muted-foreground">Errores (7d):</span>
                                <span className={cn("font-medium tabular-nums text-right", p.weekErrors > 0 && "text-rose-500")}>{p.weekErrors}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
                <SectionHeader icon={Activity} title="Timeline de ejecuciones (últimas 30)" color="brand" />
                {data.recentRuns.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Sin ejecuciones registradas</p>
                ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {data.recentRuns.map((run) => (
                            <div key={run.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                                <div className="flex items-center gap-2">
                                    {run.status === "success" ? (
                                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                                    ) : run.status === "failed" ? (
                                        <XCircle className="size-3.5 text-rose-500 shrink-0" />
                                    ) : (
                                        <Clock className="size-3.5 text-amber-500 shrink-0" />
                                    )}
                                    <span className="text-[11px] capitalize font-medium">{run.provider}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {new Date(run.startedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                    {run.seriesProcessed > 0 && <span>{run.seriesProcessed} series</span>}
                                    {run.chaptersCreated > 0 && <span>{run.chaptersCreated} caps</span>}
                                    {run.errors > 0 && <span className="text-rose-500">{run.errors} err</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card p-4">
                    <SectionHeader icon={TrendingUp} title="Capítulos por ejecución (últimas 15)" color="sky" />
                    {data.recentRuns.slice(0, 15).reverse().length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p>
                    ) : (
                        <BarChart
                            data={data.recentRuns.slice(0, 15).reverse()}
                            getLabel={(d: unknown) => (d as { provider: string }).provider}
                            getValue={(d: unknown) => (d as { chaptersCreated: number }).chaptersCreated}
                            accent="sky"
                        />
                    )}
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                    <SectionHeader icon={AlertCircle} title="Errores por ejecución (últimas 15)" color="amber" />
                    {data.recentRuns.slice(0, 15).reverse().length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p>
                    ) : (
                        <BarChart
                            data={data.recentRuns.slice(0, 15).reverse()}
                            getLabel={(d: unknown) => (d as { provider: string }).provider}
                            getValue={(d: unknown) => (d as { errors: number }).errors}
                            accent="amber"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function UserTab({ data }: { data: UserMetricsData }) {
    const totalUsers = Object.values(data.byRole).reduce((a, b) => a + b, 0);
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniCard icon={Users} label="Usuarios" value={totalUsers} sub={`${data.byRole.ADMIN ?? 0} admins`} accent="primary" />
                <MiniCard icon={Activity} label="Activos hoy" value={data.activeUsers.today} accent="emerald" />
                <MiniCard icon={Flame} label="Activos 7d" value={data.activeUsers.last7d} accent="amber" />
                <MiniCard icon={Zap} label="Activos 30d" value={data.activeUsers.last30d} accent="sky" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card p-4">
                    <SectionHeader icon={BarChart3} title="Registros por mes (últimos 12)" color="brand" />
                    {data.monthlyRegistrations.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p>
                    ) : (
                        <BarChart
                            data={data.monthlyRegistrations}
                            getLabel={(d: unknown) => String((d as { month: string }).month).slice(5, 7)}
                            getValue={(d: unknown) => (d as { count: number }).count}
                            accent="brand"
                        />
                    )}
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                    <SectionHeader icon={Users} title="Distribución por estado" color="violet" />
                    <HorizontalBar
                        data={Object.entries(data.byStatus).map(([k, v]) => ({ status: k, count: v }))}
                        getLabel={(d: unknown) => (d as { status: string }).status}
                        getValue={(d: unknown) => (d as { count: number }).count}
                        accent="brand"
                    />
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
                <SectionHeader icon={TrendingUp} title="Top lectores" color="amber" />
                {data.topReaders.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p>
                ) : (
                    <div className="space-y-2">
                        {data.topReaders.map((r, i) => (
                            <div key={r.userId} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[10px] font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                                    <div className="size-5 rounded-full bg-muted-foreground/10 flex items-center justify-center shrink-0 text-[8px] font-bold text-muted-foreground">
                                        {r.name[0]?.toUpperCase() ?? "?"}
                                    </div>
                                    <span className="text-[11px] font-medium truncate">{r.name}</span>
                                </div>
                                <span className="text-[11px] text-muted-foreground tabular-nums">{r.chaptersRead} caps</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ContentTab({ data }: { data: ContentMetricsData }) {
    const totalSeries = data.seriesByStatus.reduce((a, s) => a + s.count, 0);
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniCard icon={BookOpen} label="Total series" value={totalSeries} accent="primary" />
                <MiniCard icon={FileText} label="Capítulos totales" value={totalSeries > 0 ? "—" : "0"} sub="ver dashboard" accent="sky" />
                <MiniCard icon={AlertCircle} label="Series sin capítulos" value={data.emptySeries} sub="requieren atención" accent="rose" />
                <MiniCard icon={XCircle} label="Capítulos sin páginas" value={data.chaptersNoPages} accent="amber" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card p-4">
                    <SectionHeader icon={BarChart3} title="Series por estado" color="brand" />
                    <HorizontalBar
                        data={data.seriesByStatus.slice(0, 10)}
                        getLabel={(d: unknown) => (d as { status: string }).status}
                        getValue={(d: unknown) => (d as { count: number }).count}
                        accent="brand"
                    />
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                    <SectionHeader icon={Tag} title="Top géneros" color="violet" />
                    <HorizontalBar
                        data={data.genreDistribution.slice(0, 10)}
                        getLabel={(d: unknown) => (d as { name: string }).name}
                        getValue={(d: unknown) => (d as { count: number }).count}
                        accent="brand"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card p-4">
                    <SectionHeader icon={BarChart3} title="Capítulos por serie" color="sky" />
                    {data.chaptersPerSeries.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p>
                    ) : (
                        <BarChart
                            data={data.chaptersPerSeries}
                            getLabel={(d: unknown) => (d as { bucket: string }).bucket}
                            getValue={(d: unknown) => (d as { count: number }).count}
                            accent="sky"
                        />
                    )}
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                    <SectionHeader icon={TrendingUp} title="Series por tipo" color="amber" />
                    {data.seriesByType.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p>
                    ) : (
                        <HorizontalBar
                            data={data.seriesByType}
                            getLabel={(d: unknown) => (d as { type: string }).type}
                            getValue={(d: unknown) => (d as { count: number }).count}
                            accent="amber"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function SystemTab({ data }: { data: SystemMetricsData }) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniCard icon={Activity} label="Eventos (30d)" value={data.totalEvents} accent="primary" />
                <MiniCard icon={AlertCircle} label="Tasa error" value={`${data.errorRate.toFixed(1)}%`} accent={data.errorRate > 5 ? "rose" : "emerald"} />
                <MiniCard icon={Zap} label="Rate limits (7d)" value={data.rateLimitsLast7d} accent="amber" />
                <MiniCard icon={Server} label="Tipos de evento" value={data.eventsByType.length} accent="sky" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card p-4">
                    <SectionHeader icon={BarChart3} title="Eventos por tipo (30d)" color="brand" />
                    <HorizontalBar
                        data={data.eventsByType.slice(0, 15)}
                        getLabel={(d: unknown) => (d as { event: string }).event}
                        getValue={(d: unknown) => (d as { count: number }).count}
                        accent="brand"
                    />
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                    <SectionHeader icon={Activity} title="Top usuarios activos (30d)" color="violet" />
                    {data.topActiveUsers.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p>
                    ) : (
                        <HorizontalBar
                            data={data.topActiveUsers.slice(0, 10)}
                            getLabel={(d: unknown) => (d as { name: string }).name}
                            getValue={(d: unknown) => (d as { events: number }).events}
                            accent="violet"
                        />
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
                <SectionHeader icon={AlertCircle} title="Últimos errores de API (7d)" color="rose" />
                {data.recentErrors.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Sin errores recientes</p>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {data.recentErrors.map((err) => (
                            <div key={err.id} className="flex items-start justify-between py-1.5 border-b border-border last:border-0">
                                <div className="flex items-start gap-2 min-w-0">
                                    <AlertCircle className="size-3 text-rose-500 shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-medium truncate">{err.user}</p>
                                        {err.metadata && (
                                            <p className="text-[10px] text-muted-foreground truncate max-w-xs">
                                                {JSON.stringify(err.metadata).slice(0, 80)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <span className="text-[9px] text-muted-foreground shrink-0">
                                    {new Date(err.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AdminMetrics() {
    const [tab, setTab] = useState<Tab>("scrapers");
    const [scraperData, setScraperData] = useState<ScraperMetricsData | null>(null);
    const [userData, setUserData] = useState<UserMetricsData | null>(null);
    const [contentData, setContentData] = useState<ContentMetricsData | null>(null);
    const [systemData, setSystemData] = useState<SystemMetricsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            getScraperMetrics().then((r) => setScraperData(r.data)).catch(() => {}),
            getUserMetrics().then((r) => setUserData(r.data)).catch(() => {}),
            getContentMetrics().then((r) => setContentData(r.data)).catch(() => {}),
            getSystemMetrics().then((r) => setSystemData(r.data)).catch(() => {}),
        ]).finally(() => setLoading(false));
    }, []);

    const renderContent = () => {
        if (loading) {
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 rounded-xl" />
                        ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <Skeleton key={i} className="h-48 rounded-xl" />
                        ))}
                    </div>
                </div>
            );
        }

        switch (tab) {
            case "scrapers":
                return scraperData ? <ScraperTab data={scraperData} /> : <EmptyState />;
            case "usuarios":
                return userData ? <UserTab data={userData} /> : <EmptyState />;
            case "contenido":
                return contentData ? <ContentTab data={contentData} /> : <EmptyState />;
            case "sistema":
                return systemData ? <SystemTab data={systemData} /> : <EmptyState />;
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
            <SEO title="Métricas del sistema" />

            <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border">
                <div className="container mx-auto grid grid-cols-[auto_1fr] items-center h-14 px-4">
                    <SidebarTrigger />
                    <div className="flex justify-center min-w-0">
                        <span className="text-xs font-medium text-muted-foreground">Métricas del sistema</span>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0">
                <div className="flex border-b border-border mb-6 overflow-x-auto">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors shrink-0",
                                tab === t.id
                                    ? "border-brand text-foreground"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30",
                            )}
                        >
                            <t.icon className="size-3.5" />
                            {t.label}
                        </button>
                    ))}
                </div>

                {renderContent()}
            </main>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <BarChart3 className="size-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No se pudieron cargar los datos</p>
        </div>
    );
}
