import { useEffect, useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { CoverImage } from "@/components/coverImage";
import { fetchLatestManga, fetchReadingStats } from "@/api/manga";
import type { Manga } from "@/types/manga";
import { useAuthStore } from "@/store/authStore";
import { timeAgo } from "@/lib/date";
import {
    Clock,
    Flame,
    BookOpen,
    Eye,
    BarChart3,
    CheckCircle2,
    Timer,
    TrendingUp,
    ChevronRight,
    Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PullToRefresh } from "@/components/pullToRefresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { SearchBar } from "@/components/search-bar";
import {
    ContinueReadingSection,
    ContinueSkeleton,
    type ContinueReadingItem,
} from "@/components/continue-reading";

interface ReadingStats {
    totalChaptersRead: number;
    totalSeries: number;
    completedSeries: number;
    completionPercent: number;
    estimatedHours: number;
    currentStreak: number;
    bestStreak: number;
    chaptersThisMonth: number;
    estimatedHoursThisMonth: number;
    continueReading: ContinueReadingItem[];
}

const StatCard = memo(function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    color = "primary",
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    sub?: string;
    color?: "primary" | "emerald" | "amber" | "sky";
}) {
    const colorMap = {
        primary: "bg-brand/15 text-brand shadow-[0_0_12px_-4px] shadow-brand/30",
        emerald: "bg-brand-green/15 text-brand-green shadow-[0_0_12px_-4px] shadow-brand-green/30",
        amber: "bg-brand-amber/15 text-brand-amber shadow-[0_0_12px_-4px] shadow-brand-amber/30",
        sky: "bg-brand-cyan/15 text-brand-cyan shadow-[0_0_12px_-4px] shadow-brand-cyan/30",
    };

    return (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-white/10 dark:border-white/[0.05] bg-card transition-all duration-200 hover:border-brand/20 hover:shadow-[0_0_20px_-8px] hover:shadow-brand/20">
            <div
                className={`flex items-center justify-center size-10 rounded-lg shrink-0 ${colorMap[color]}`}
            >
                <Icon className="size-5" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground leading-none mb-1">
                    {label}
                </p>
                <p className="text-xl font-bold leading-none tabular-nums">{value}</p>
                {sub && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                        {sub}
                    </p>
                )}
            </div>
        </div>
    );
});

function StatsSection({ stats }: { stats: ReadingStats }) {
    const navigate = useNavigate();
    return (
        <section>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold tracking-wide">
                        Tu progreso
                    </h2>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground h-7 px-2 hover:text-foreground"
                    onClick={() => navigate("/estadisticas")}
                >
                    Ver estadísticas completas
                    <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <StatCard
                    icon={BookOpen}
                    label="Capítulos este mes"
                    value={stats.chaptersThisMonth.toLocaleString()}
                    sub={`${stats.totalChaptersRead.toLocaleString()} en total`}
                    color="primary"
                />
                <StatCard
                    icon={CheckCircle2}
                    label="Series terminadas"
                    value={stats.completedSeries}
                    sub={`de ${stats.totalSeries} seguidas`}
                    color="emerald"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Finalización media"
                    value={`${stats.completionPercent}%`}
                    color="amber"
                />
                <StatCard
                    icon={Timer}
                    label="Horas este mes"
                    value={stats.estimatedHoursThisMonth.toLocaleString()}
                    sub={`${stats.estimatedHours.toLocaleString()} en total`}
                    color="sky"
                />
            </div>

            {(stats.currentStreak > 0 || stats.bestStreak > 0) && (
                <div className="flex items-center justify-center gap-8 p-4 rounded-xl border border-white/10 dark:border-white/[0.05] bg-card transition-all duration-200 hover:border-brand/20 hover:shadow-[0_0_20px_-8px] hover:shadow-brand/20">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center size-7 rounded-lg bg-orange-500/10 text-orange-500 shrink-0">
                            <Flame className="size-3.5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground leading-none mb-0.5">
                                Racha actual
                            </p>
                            <p className="text-sm font-bold leading-none tabular-nums">
                                {stats.currentStreak}{" "}
                                {stats.currentStreak === 1 ? "día" : "días"}
                            </p>
                        </div>
                    </div>
                    <div className="h-6 w-px bg-border/50" />
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center size-7 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                            <Trophy className="size-3.5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground leading-none mb-0.5">
                                Mejor racha
                            </p>
                            <p className="text-sm font-bold leading-none tabular-nums">
                                {stats.bestStreak}{" "}
                                {stats.bestStreak === 1 ? "día" : "días"}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

const MangaCard = memo(function MangaCard({
    manga,
    index,
}: {
    manga: Manga;
    index: number;
}) {
    const navigate = useNavigate();

    return (
        <div className="group animate-fade-in-up" style={{ animationDelay: `${index * 30}ms` }}>
            <a
                href={`/manga/${manga.slug}`}
                onClick={(e) => {
                    e.preventDefault();
                    navigate(`/manga/${manga.slug}`, { state: { from: "/" } });
                }}
                className="relative block aspect-[2/3] rounded-xl overflow-hidden border border-white/10 dark:border-white/[0.05] shadow-md transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-[0_0_25px_-5px] group-hover:shadow-brand/30 group-hover:border-brand/20 active:scale-[0.98] active:shadow-[0_0_25px_-3px] active:shadow-brand/50"
            >
                <CoverImage src={manga.cover} alt={manga.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-t from-brand/20 via-transparent to-transparent" />
                <Badge
                    variant="secondary"
                    className="absolute top-2 right-2 flex items-center gap-1 text-[9px] px-1.5 py-0 h-4"
                >
                    {manga.lastReadChapterName !== null && (
                        <>
                            <Eye className="h-2 w-2" />
                            {manga.lastReadChapterName}
                            <span className="opacity-40">/</span>
                        </>
                    )}
                    <BookOpen className="h-2 w-2" />
                    {manga.lastAvailableChapterName ?? "-"}
                </Badge>
                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[9px] text-white/60">
                    <Clock className="h-2.5 w-2.5" />
                    {timeAgo(manga.lastChapterPublishedAt!)}
                </div>
            </a>
            <div className="mt-2">
                <h3
                    className="text-[11px] font-semibold text-foreground truncate leading-tight"
                    title={manga.name}
                >
                    {manga.name}
                </h3>
            </div>
        </div>
    );
});

function MangaCardSkeleton() {
    return (
        <div className="space-y-2">
            <Skeleton className="aspect-[2/3] rounded-xl w-full" />
            <Skeleton className="h-3 w-3/4 rounded" />
        </div>
    );
}

const StatsSkeleton = memo(function StatsSkeleton() {
    return (
        <section>
            <Skeleton className="h-4 w-32 mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
            </div>
            <Skeleton className="h-16 rounded-xl" />
        </section>
    );
});

export default function Home() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const [mangas, setMangas] = useState<Manga[]>([]);
    const [stats, setStats] = useState<ReadingStats | null>(null);
    const [loadingLatest, setLoadingLatest] = useState(true);
    const [loadingStats, setLoadingStats] = useState(false);
    const [error, setError] = useState(false);

    const { pull, refreshing } = usePullToRefresh(() => {
        window.location.reload();
    });

    useEffect(() => {
        fetchLatestManga(24)
            .then(setMangas)
            .catch(() => setError(true))
            .finally(() => setLoadingLatest(false));
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) return;
        async function load() {
            setLoadingStats(true);
            try {
                const data = await fetchReadingStats();
                setStats(data);
            } catch {
                setStats(null);
            } finally {
                setLoadingStats(false);
            }
        }
        load();
    }, [isAuthenticated]);

    return (
        <>
            <PullToRefresh pull={pull} refreshing={refreshing} />
            <div className="min-h-screen bg-background">
                <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border shadow-[0_1px_0_0] shadow-brand/5">
                    <div className="container mx-auto grid grid-cols-[auto_1fr] items-center h-16 px-4 gap-4">
                        <SidebarTrigger />
                        <div className="flex justify-center min-w-0">
                            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                                <div className="hidden sm:flex items-center gap-2 shrink-0">
                                    <Flame className="h-4 w-4 text-orange-400" />
                                    <span className="text-sm font-semibold text-foreground tracking-wide">
                                        Inicio
                                    </span>
                                </div>
                                <div className="w-full max-w-md">
                                    <SearchBar />
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 py-8 space-y-10">
                    {isAuthenticated && (
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
                            {loadingStats ? (
                                <ContinueSkeleton />
                            ) : (
                                stats && (
                                    <ContinueReadingSection
                                        items={stats.continueReading}
                                    />
                                )
                            )}
                            {loadingStats ? (
                                <StatsSkeleton />
                            ) : (
                                stats && <StatsSection stats={stats} />
                            )}
                        </div>
                    )}

                    <section aria-labelledby="latest-updates-heading">
                    <div className="flex items-center gap-2 mb-4">
                            <span className="relative flex items-center justify-center size-6 rounded-md bg-brand-amber/15 text-brand-amber">
                                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                            <h2 id="latest-updates-heading" className="text-sm font-semibold tracking-wide">
                                Últimas actualizaciones
                            </h2>
                        </div>

                        {error && (
                            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center" role="alert">
                                <p className="text-muted-foreground text-sm">
                                    No se pudieron cargar las actualizaciones
                                </p>
                            </div>
                        )}

                        <div
                            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3"
                            style={{ contentVisibility: "auto" }}
                            aria-live="polite"
                            aria-atomic="true"
                        >
                            {loadingLatest
                                ? Array.from({ length: 24 }).map((_, i) => (
                                      <MangaCardSkeleton key={i} />
                                  ))
                                : mangas.map((manga, i) => (
                                      <MangaCard
                                          key={manga.id}
                                          manga={manga}
                                          index={i}
                                      />
                                  ))}
                        </div>

                        {!loadingLatest && mangas.length === 0 && !error && (
                            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                                <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                                <p className="text-muted-foreground text-sm">
                                    No hay actualizaciones recientes
                                </p>
                            </div>
                        )}
                    </section>
                </main>
            </div>
        </>
    );
}
