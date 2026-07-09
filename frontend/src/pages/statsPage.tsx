import { SEO } from "@/components/seo";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHeader } from "@/context/headerContext";
import { SearchBar } from "@/components/search-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { CoverImage } from "@/components/coverImage";
import { fetchFullStats } from "@/api/manga";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import {
    BookOpen,
    FileText,
    Clock,
    Library,
    CheckCircle2,
    TrendingUp,
    Tag,
    Calendar,
    Flame,
    Trophy,
    BarChart3,
    Activity,
    Star,
    Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FullStats {
    totalChaptersRead: number;
    totalPagesEstimated: number;
    estimatedHours: number;
    totalSeries: number;
    startedSeries: number;
    completedSeries: number;
    completionRate: number;
    topGenre: string | null;
    topGenres: { name: string; count: number }[];
    mostActiveDay: string;
    activityByDay: { name: string; count: number }[];
    currentStreak: number;
    bestStreak: number;
    activityLast30: { date: string; count: number }[];
    monthlyActivity: { key: string; label: string; count: number }[];
    topSeries: {
        name: string;
        slug: string;
        cover: string | null;
        fallbackCover?: string | null;
        chapterCount: number;
        chaptersRead: number;
        lastReadChapterName: string | null;
        lastAvailableChapterName: string | null;
    }[];
    firstReadDate: string | null;
    avgChaptersPerDay: number;
    totalActiveDays: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function daysSince(dateStr: string) {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    accent = "primary",
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    sub?: string;
    accent?: "primary" | "emerald" | "amber" | "sky" | "rose" | "violet";
}) {
    const accentMap = {
        primary: "border-brand/30",
        emerald: "border-brand-green/30",
        amber: "border-brand-amber/30",
        sky: "border-brand-cyan/30",
        rose: "border-brand/30",
        violet: "border-brand-purple/30",
    };
    const iconMap = {
        primary: "bg-brand/15 text-brand shadow-[0_0_12px_-4px] shadow-brand/30",
        emerald: "bg-brand-green/15 text-brand-green shadow-[0_0_12px_-4px] shadow-brand-green/30",
        amber: "bg-brand-amber/15 text-brand-amber shadow-[0_0_12px_-4px] shadow-brand-amber/30",
        sky: "bg-brand-cyan/15 text-brand-cyan shadow-[0_0_12px_-4px] shadow-brand-cyan/30",
        rose: "bg-brand/15 text-brand shadow-[0_0_12px_-4px] shadow-brand/30",
        violet: "bg-brand-purple/15 text-brand-purple shadow-[0_0_12px_-4px] shadow-brand-purple/30",
    };

    return (
        <div
            className={`rounded-xl border bg-card p-5 flex items-start gap-4 ${accentMap[accent]}`}
        >
            <div
                className={`flex items-center justify-center size-10 rounded-lg shrink-0 ${iconMap[accent]}`}
            >
                <Icon className="size-5" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-1 leading-none">
                    {label}
                </p>
                <p className="text-2xl font-bold leading-none tracking-tight tabular-nums">
                    {value}
                </p>
                {sub && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                        {sub}
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
    icon: Icon,
    title,
    color = "brand",
}: {
    icon: React.ElementType;
    title: string;
    color?: "brand" | "cyan" | "amber" | "green" | "purple";
}) {
    const colorClass = {
        brand: "bg-brand/15 text-brand",
        cyan: "bg-brand-cyan/15 text-brand-cyan",
        amber: "bg-brand-amber/15 text-brand-amber",
        green: "bg-brand-green/15 text-brand-green",
        purple: "bg-brand-purple/15 text-brand-purple",
    };
    return (
        <div className="flex items-center gap-2 mb-4">
            <span className={`flex items-center justify-center size-6 rounded-md shrink-0 ${colorClass[color]}`}>
                <Icon className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
        </div>
    );
}

// ─── Activity Heatmap (últimos 30 días) ───────────────────────────────────────

function ActivityHeatmap({
    data,
}: {
    data: { date: string; count: number }[];
}) {
    const max = Math.max(...data.map((d) => d.count), 1);

    function getIntensity(count: number) {
        if (count === 0) return "bg-muted";
        const pct = count / max;
        if (pct < 0.25) return "bg-brand/20";
        if (pct < 0.5) return "bg-brand/40";
        if (pct < 0.75) return "bg-brand/60";
        return "bg-brand shadow-[0_0_6px_-2px] shadow-brand/60";
    }

    return (
        <div className="rounded-xl border border-white/10 dark:border-white/[0.05] bg-card p-5">
            <SectionHeader icon={Activity} title="Actividad últimos 30 días" color="brand" />
            <div className="flex gap-1 flex-wrap">
                {data.map((d) => (
                    <div
                        key={d.date}
                        title={`${d.date}: ${d.count} capítulos`}
                        className={`size-6 rounded-sm transition-all duration-150 ${getIntensity(d.count)}`}
                    />
                ))}
            </div>
            <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] text-muted-foreground">Menos</span>
                {[
                    "bg-muted",
                    "bg-brand/20",
                    "bg-brand/40",
                    "bg-brand/60",
                    "bg-brand",
                ].map((c) => (
                    <div key={c} className={`size-3 rounded-sm ${c}`} />
                ))}
                <span className="text-[10px] text-muted-foreground">Más</span>
            </div>
        </div>
    );
}

// ─── Bar Chart mensual ────────────────────────────────────────────────────────

function MonthlyBar({ data }: { data: { label: string; count: number }[] }) {
    const max = Math.max(...data.map((d) => d.count), 1);

    return (
        <div className="rounded-xl border border-white/10 dark:border-white/[0.05] bg-card p-5">
            <SectionHeader icon={BarChart3} title="Capítulos por mes" color="cyan" />
            <div className="flex items-end gap-2 h-28">
                {data.map((d) => (
                    <div
                        key={d.label}
                        className="flex-1 flex flex-col items-center gap-1"
                    >
                        <span className="text-[10px] text-muted-foreground font-medium">
                            {d.count > 0 ? d.count : ""}
                        </span>
                        <div
                            className="w-full relative flex items-end"
                            style={{ height: "80px" }}
                        >
                            <div
                                className="w-full rounded-t-md bg-gradient-to-t from-brand to-brand-cyan transition-all duration-500 shadow-[0_0_8px_-3px] shadow-brand/30"
                                style={{
                                    height: `${(d.count / max) * 80}px`,
                                    minHeight: d.count > 0 ? "4px" : "0",
                                }}
                            />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                            {d.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Activity by day of week ──────────────────────────────────────────────────

function WeekdayChart({
    data,
    mostActive,
}: {
    data: { name: string; count: number }[];
    mostActive: string;
}) {
    const max = Math.max(...data.map((d) => d.count), 1);

    return (
        <div className="rounded-xl border border-white/10 dark:border-white/[0.05] bg-card p-5">
            <SectionHeader
                icon={Calendar}
                title="Actividad por día de la semana"
                color="amber"
            />
            <div className="space-y-2">
                {data.map((d) => {
                    const isActive = d.name === mostActive.slice(0, 3);
                    return (
                        <div key={d.name} className="flex items-center gap-3">
                            <span
                                className={`text-xs w-8 shrink-0 ${isActive ? "text-brand font-semibold" : "text-muted-foreground"}`}
                            >
                                {d.name}
                            </span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${isActive ? "bg-gradient-to-r from-brand to-brand-cyan" : "bg-brand/30"}`}
                                    style={{
                                        width: `${(d.count / max) * 100}%`,
                                    }}
                                />
                            </div>
                            <span className="text-[10px] text-muted-foreground w-8 text-right">
                                {d.count}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Top Genres ───────────────────────────────────────────────────────────────

function TopGenres({ genres }: { genres: { name: string; count: number }[] }) {
    const max = genres[0]?.count ?? 1;

    return (
        <div className="rounded-xl border border-white/10 dark:border-white/[0.05] bg-card p-5">
            <SectionHeader icon={Tag} title="Géneros más leídos" color="purple" />
            <div className="space-y-3">
                {genres.map((g, i) => (
                    <div key={g.name} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-muted-foreground w-4 shrink-0">
                            {i + 1}
                        </span>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium">
                                    {g.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {g.count} caps
                                </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand transition-all duration-500"
                                    style={{
                                        width: `${(g.count / max) * 100}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Top Series ───────────────────────────────────────────────────────────────

function TopSeriesSection({ series }: { series: FullStats["topSeries"] }) {
    const navigate = useNavigate();

    return (
        <div className="rounded-xl border border-white/10 dark:border-white/[0.05] bg-card p-5">
            <SectionHeader icon={Star} title="Series más leídas" color="green" />
            <div className="space-y-3">
                {series.map((s, i) => {
                    const pct =
                        s.lastReadChapterName && s.lastAvailableChapterName
                            ? Math.min(
                                  (parseFloat(s.lastReadChapterName) /
                                      parseFloat(s.lastAvailableChapterName)) *
                                      100,
                                  100,
                              )
                            : Math.min(
                                  (s.chaptersRead / s.chapterCount) * 100,
                                  100,
                              );
                    return (
                        <div
                            key={s.slug}
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={() =>
                                navigate(`/manga/${s.slug}`, {
                                    state: { from: "/estadisticas" },
                                })
                            }
                        >
                            <span className="text-[10px] font-bold text-muted-foreground w-4 shrink-0">
                                {i + 1}
                            </span>
                            <div className="size-10 shrink-0 rounded-lg overflow-hidden border border-border">
                                <CoverImage
                                    src={s.cover}
                                    alt={s.name}
                                    fallbackSrc={s.fallbackCover}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                                    {s.name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-brand-green to-brand-cyan"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                        {s.lastReadChapterName ??
                                            s.chaptersRead}{" "}
                                        /{" "}
                                        {s.lastAvailableChapterName ??
                                            s.chapterCount}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function StatsSkeleton() {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
            </div>
        </div>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyStats() {
    const navigate = useNavigate();
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="flex items-center justify-center size-16 rounded-2xl bg-muted">
                <BarChart3 className="size-8 text-muted-foreground/40" />
            </div>
            <div>
                <p className="font-semibold mb-1">Aún no hay estadísticas</p>
                <p className="text-sm text-muted-foreground">
                    Empieza a leer para ver tu progreso aquí
                </p>
            </div>
            <button
                onClick={() => navigate("/mangas")}
                className="text-sm text-primary underline underline-offset-4"
            >
                Explorar catálogo
            </button>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatsPage() {
    const [stats, setStats] = useState<FullStats | null>(null);
    const [loading, setLoading] = useState(true);
    const { setContent } = useHeader();

    useEffect(() => {
        setContent({
            center: <SearchBar />,
        });
        return () => setContent({});
    }, [setContent]);

    useEffect(() => {
        async function load() {
            try {
                const data = await fetchFullStats();
                setStats(data);
            } catch {
                setStats(null);
                toast.error("No se pudieron cargar las estadísticas");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    return (
        <>
            <SEO title="Mis Estadísticas" description="Revisa tus estadísticas de lectura en Mangalovers: capítulos leídos, rachas, géneros favoritos y más." canonicalPath="/estadisticas" />
            <div className="min-h-screen bg-background">

            <main className="container mx-auto px-4 py-8">
                {loading && <StatsSkeleton />}
                {!loading && (!stats || stats.totalChaptersRead === 0) && (
                    <EmptyStats />
                )}

                {!loading && stats && stats.totalChaptersRead > 0 && (
                    <div className="space-y-6">
                        {/* Intro — días en la plataforma */}
                        {stats.firstReadDate && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
                                <Zap className="h-3.5 w-3.5 text-primary" />
                                <span>
                                    Llevas{" "}
                                    <span className="font-semibold text-foreground">
                                        {daysSince(stats.firstReadDate)} días
                                    </span>{" "}
                                    leyendo desde el{" "}
                                    <span className="font-semibold text-foreground">
                                        {formatDate(stats.firstReadDate)}
                                    </span>
                                </span>
                            </div>
                        )}

                        {/* Grid principal de stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatCard
                                icon={BookOpen}
                                label="Capítulos leídos"
                                value={stats.totalChaptersRead.toLocaleString()}
                                accent="primary"
                            />
                            <StatCard
                                icon={FileText}
                                label="Páginas estimadas"
                                value={stats.totalPagesEstimated.toLocaleString()}
                                sub="~20 páginas por cap."
                                accent="sky"
                            />
                            <StatCard
                                icon={Clock}
                                label="Horas de lectura"
                                value={stats.estimatedHours.toLocaleString()}
                                sub="~7 min por cap."
                                accent="violet"
                            />
                            <StatCard
                                icon={Zap}
                                label="Promedio diario"
                                value={`${stats.avgChaptersPerDay} caps`}
                                sub={`en ${stats.totalActiveDays} días activos`}
                                accent="amber"
                            />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatCard
                                icon={Library}
                                label="Series seguidas"
                                value={stats.totalSeries}
                                accent="primary"
                            />
                            <StatCard
                                icon={TrendingUp}
                                label="Series iniciadas"
                                value={stats.startedSeries}
                                accent="sky"
                            />
                            <StatCard
                                icon={CheckCircle2}
                                label="Series terminadas"
                                value={stats.completedSeries}
                                accent="emerald"
                            />
                            <StatCard
                                icon={Trophy}
                                label="Tasa de finalización"
                                value={`${stats.completionRate}%`}
                                sub="series empezadas y terminadas"
                                accent="amber"
                            />
                        </div>

                        {/* Rachas + género + día activo */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="rounded-xl border border-brand-amber/30 bg-card p-5 flex items-center gap-4 shadow-[0_0_20px_-10px] shadow-brand-amber/20">
                                <div className="flex items-center justify-center size-10 rounded-lg bg-brand-amber/15 text-brand-amber shadow-[0_0_12px_-4px] shadow-brand-amber/30 shrink-0">
                                    <Flame className="size-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">
                                        Racha actual
                                    </p>
                                    <p className="text-2xl font-bold leading-none tabular-nums">
                                        {stats.currentStreak}
                                        <span className="text-sm font-normal text-muted-foreground ml-1">
                                            {stats.currentStreak === 1
                                                ? "día"
                                                : "días"}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-xl border border-brand-amber/30 bg-card p-5 flex items-center gap-4 shadow-[0_0_20px_-10px] shadow-brand-amber/20">
                                <div className="flex items-center justify-center size-10 rounded-lg bg-brand-amber/15 text-brand-amber shadow-[0_0_12px_-4px] shadow-brand-amber/30 shrink-0">
                                    <Trophy className="size-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">
                                        Mejor racha
                                    </p>
                                    <p className="text-2xl font-bold leading-none tabular-nums">
                                        {stats.bestStreak}
                                        <span className="text-sm font-normal text-muted-foreground ml-1">
                                            {stats.bestStreak === 1
                                                ? "día"
                                                : "días"}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-xl border border-white/10 dark:border-white/[0.05] bg-card p-5 flex items-center gap-4">
                                <div className="flex items-center justify-center size-10 rounded-lg bg-brand/15 text-brand shadow-[0_0_12px_-4px] shadow-brand/30 shrink-0">
                                    <Calendar className="size-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">
                                        Día más activo
                                    </p>
                                    <p className="text-xl font-bold leading-none">
                                        {stats.mostActiveDay}
                                    </p>
                                    {stats.topGenre && (
                                        <p className="text-[11px] text-muted-foreground mt-1">
                                            Género favorito:{" "}
                                            <span className="font-medium text-foreground">
                                                {stats.topGenre}
                                            </span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Heatmap */}
                        <ActivityHeatmap data={stats.activityLast30} />

                        {/* Charts 2 columnas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <MonthlyBar data={stats.monthlyActivity} />
                            <WeekdayChart
                                data={stats.activityByDay}
                                mostActive={stats.mostActiveDay}
                            />
                        </div>

                        {/* Top series + top géneros */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {stats.topSeries.length > 0 && (
                                <TopSeriesSection series={stats.topSeries} />
                            )}
                            {stats.topGenres.length > 0 && (
                                <TopGenres genres={stats.topGenres} />
                            )}
                        </div>

                        {/* Tasa de finalización visual */}
                        <div className="rounded-xl border border-white/10 dark:border-white/[0.05] bg-card p-5">
                            <SectionHeader
                                icon={CheckCircle2}
                                title="Progreso de colección"
                                color="green"
                            />
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between mb-1.5">
                                        <span className="text-xs text-muted-foreground">
                                            Tasa de finalización
                                        </span>
                                        <span className="text-xs font-semibold">
                                            {stats.completionRate}%
                                        </span>
                                    </div>
                                    <Progress
                                        value={stats.completionRate}
                                        className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-brand-green [&>div]:to-brand"
                                    />
                                    <p className="text-[11px] text-muted-foreground mt-1.5">
                                        {stats.completedSeries} de{" "}
                                        {stats.startedSeries} series iniciadas
                                        terminadas
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
        </>
    );
}
