import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchLatestManga, fetchReadingStats } from "@/api/manga";
import type { Manga } from "@/types/manga";
import { useAuthStore } from "@/store/authStore";
import {
    Clock,
    Flame,
    BookOpen,
    Eye,
    PlayCircle,
    BookMarked,
    BarChart3,
    CheckCircle2,
    Timer,
    TrendingUp,
    ChevronRight,
    Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.floor(diff / 60);
    const hours = Math.floor(diff / 3600);
    const days = Math.floor(diff / 86400);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (diff < 60) return "Justo ahora";
    if (minutes < 60) return `${minutes} min`;
    if (hours === 1) return "1 hora";
    if (hours < 24) return `${hours} horas`;
    if (days === 1) return "Ayer";
    if (days <= 7) return `${days} días`;
    if (weeks === 1) return "1 semana";
    if (weeks <= 4) return `${weeks} semanas`;
    if (months === 1) return "1 mes";
    if (months <= 11) return `${months} meses`;
    if (years === 1) return "1 año";
    return `${years} años`;
}

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
    continueReading: {
        id: number;
        name: string;
        slug: string;
        cover: string | null;
        lastReadChapterName: string | null;
        lastAvailableChapterName: string | null;
        chaptersLeft: number | null;
    }[];
}

function StatCard({
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
        primary: "bg-primary/10 text-primary",
        emerald: "bg-emerald-500/10 text-emerald-500",
        amber: "bg-amber-500/10 text-amber-500",
        sky: "bg-sky-500/10 text-sky-500",
    };

    return (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
            <div
                className={`flex items-center justify-center size-10 rounded-lg shrink-0 ${colorMap[color]}`}
            >
                <Icon className="size-5" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground leading-none mb-1">
                    {label}
                </p>
                <p className="text-xl font-bold leading-none">{value}</p>
                {sub && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                        {sub}
                    </p>
                )}
            </div>
        </div>
    );
}

function StatsSection({ stats }: { stats: ReadingStats }) {
    const navigate = useNavigate();
    return (
        <section className="h-full flex flex-col">
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
                <div className="mt-auto flex items-center justify-center gap-8 px-4 py-3 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center size-7 rounded-lg bg-orange-500/10 text-orange-500 shrink-0">
                            <Flame className="size-3.5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground leading-none mb-0.5">
                                Racha actual
                            </p>
                            <p className="text-sm font-bold leading-none">
                                {stats.currentStreak}{" "}
                                {stats.currentStreak === 1 ? "día" : "días"}
                            </p>
                        </div>
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center size-7 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                            <Trophy className="size-3.5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground leading-none mb-0.5">
                                Mejor racha
                            </p>
                            <p className="text-sm font-bold leading-none">
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

function ContinueReadingSection({
    items,
}: {
    items: ReadingStats["continueReading"];
}) {
    const navigate = useNavigate();

    if (items.length === 0) {
        return (
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <PlayCircle className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold tracking-wide">
                        Continuar leyendo
                    </h2>
                </div>
                <div className="flex flex-col items-center justify-center py-10 gap-3 rounded-xl border border-dashed border-border text-center">
                    <BookMarked className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                        Aún no has empezado a leer ninguna serie
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/mangas")}
                    >
                        Explorar catálogo
                    </Button>
                </div>
            </section>
        );
    }

    return (
        <section className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <PlayCircle className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold tracking-wide">
                        Continuar leyendo
                    </h2>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground h-7 px-2 hover:text-foreground"
                    onClick={() => navigate("/favoritos")}
                >
                    Ver todos
                    <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {items.map((item) => {
                    const progress =
                        item.lastReadChapterName &&
                        item.lastAvailableChapterName
                            ? Math.min(
                                  (parseFloat(item.lastReadChapterName) /
                                      parseFloat(
                                          item.lastAvailableChapterName,
                                      )) *
                                      100,
                                  100,
                              )
                            : 0;

                    return (
                        <div key={item.id} className="group">
                            <a
                                href={`/manga/${item.slug}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate(`/manga/${item.slug}`);
                                }}
                                className="relative block aspect-[2/3] rounded-xl overflow-hidden border border-border shadow-md transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-lg"
                            >
                                {item.cover ? (
                                    <img
                                        src={item.cover}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center">
                                        <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
                                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                                {item.lastReadChapterName && (
                                    <div className="absolute top-2 right-2">
                                        <Badge
                                            variant="secondary"
                                            className="text-[9px] px-1.5 py-0 h-4 gap-1"
                                        >
                                            <Eye className="h-2 w-2" />
                                            {item.lastReadChapterName}
                                        </Badge>
                                    </div>
                                )}
                            </a>
                            <div className="mt-2 space-y-0.5">
                                <h3
                                    className="text-[11px] font-semibold truncate leading-tight"
                                    title={item.name}
                                >
                                    {item.name}
                                </h3>
                                {item.chaptersLeft !== null &&
                                    item.chaptersLeft > 0 && (
                                        <p className="text-[10px] text-muted-foreground">
                                            {item.chaptersLeft} cap. pendientes
                                        </p>
                                    )}
                                {item.chaptersLeft === 0 && (
                                    <p className="text-[10px] text-emerald-500 font-medium">
                                        Al día
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function MangaCard({ manga, index }: { manga: Manga; index: number }) {
    const navigate = useNavigate();
    const [imgLoaded, setImgLoaded] = useState(false);

    return (
        <div className="group" style={{ animationDelay: `${index * 30}ms` }}>
            <a
                href={`/manga/${manga.slug}`}
                onClick={(e) => {
                    e.preventDefault();
                    navigate(`/manga/${manga.slug}`, { state: { from: "/" } });
                }}
                className="relative block aspect-[2/3] rounded-xl overflow-hidden border border-border shadow-md transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-lg"
            >
                {!imgLoaded && (
                    <div className="absolute inset-0 bg-muted animate-pulse" />
                )}
                <img
                    src={manga.cover || ""}
                    alt={manga.name}
                    onLoad={() => setImgLoaded(true)}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
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
}

function MangaCardSkeleton() {
    return (
        <div className="space-y-2">
            <Skeleton className="aspect-[2/3] rounded-xl w-full" />
            <Skeleton className="h-3 w-3/4 rounded" />
        </div>
    );
}

function StatsSkeleton() {
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
}

function ContinueSkeleton() {
    return (
        <section>
            <Skeleton className="h-4 w-40 mb-4" />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="aspect-[2/3] rounded-xl" />
                        <Skeleton className="h-3 w-3/4" />
                    </div>
                ))}
            </div>
        </section>
    );
}

export default function Home() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const [mangas, setMangas] = useState<Manga[]>([]);
    const [stats, setStats] = useState<ReadingStats | null>(null);
    const [loadingLatest, setLoadingLatest] = useState(true);
    const [loadingStats, setLoadingStats] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        fetchLatestManga(24)
            .then(setMangas)
            .catch(() => setError(true))
            .finally(() => setLoadingLatest(false));
    }, []);

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
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 w-full bg-background/90 backdrop-blur border-b border-border">
                <div className="container mx-auto flex h-16 items-center px-4 gap-3 max-w-7xl">
                    <SidebarTrigger />
                    <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-orange-400" />
                        <span className="text-sm font-semibold text-foreground tracking-wide">
                            Inicio
                        </span>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-7xl space-y-10">
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

                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Flame className="h-4 w-4 text-orange-400" />
                        <h2 className="text-sm font-semibold tracking-wide">
                            Últimas actualizaciones
                        </h2>
                    </div>

                    {error && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                            <p className="text-muted-foreground text-sm">
                                No se pudieron cargar las actualizaciones
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
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
    );
}
