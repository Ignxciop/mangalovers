import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSeriesDetail } from "@/hooks/useSeriesDetail";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
    BookOpen,
    ChevronLeft,
    Clock,
    Hash,
    Layers,
    Play,
    Eye,
    EyeOff,
    Heart,
    ChevronDown,
    ArrowUpDown,
    PlayCircle,
    Share2,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useFavorite } from "@/hooks/useFavorite";
import { useReadChapters } from "@/hooks/useReadChapters";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";

function MangaDetailSkeleton() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-10 max-w-6xl">
                <Skeleton className="h-5 w-24 mb-10" />
                <div className="flex gap-10">
                    <Skeleton className="w-64 shrink-0 aspect-[2/3] rounded-xl" />
                    <div className="flex-1 space-y-4 pt-2">
                        <Skeleton className="h-10 w-3/4" />
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-px w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/6" />
                        <div className="flex gap-2 pt-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton
                                    key={i}
                                    className="h-6 w-16 rounded-full"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string | null }) {
    if (!status) return null;
    const map: Record<string, { label: string; className: string }> = {
        Activo: {
            label: "En emisión",
            className:
                "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        },
        Finalizado: {
            label: "Finalizado",
            className:
                "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
        },
        "Pausado por el autor (Hiatus)": {
            label: "Hiatus",
            className:
                "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        },
        "Abandonado por el scan": {
            label: "Abandonado",
            className:
                "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
        },
    };
    const config = map[status] ?? {
        label: status,
        className: "bg-muted text-muted-foreground border-border",
    };
    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase border ${config.className}`}
        >
            {config.label}
        </span>
    );
}

function ChapterRow({
    chapter,
    isRead,
    onToggleRead,
    onClick,
}: {
    chapter: {
        id: number;
        name: string;
        publishedAt: string;
        createdAt: string;
        chapterNumber: number;
    };
    isRead: boolean;
    onToggleRead: (e: React.MouseEvent) => void;
    onClick: () => void;
}) {
    const date = new Date(chapter.publishedAt).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
    return (
        <div
            onClick={onClick}
            className={`group flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-all duration-150 border ${
                isRead
                    ? "border-transparent hover:bg-muted hover:border-border opacity-50 hover:opacity-100"
                    : "border-transparent hover:bg-muted hover:border-border"
            }`}
        >
            <div className="flex items-center gap-3 min-w-0">
                <span className="text-[11px] font-mono text-muted-foreground w-6 shrink-0 text-right">
                    {chapter.chapterNumber}
                </span>
                <button
                    onClick={onToggleRead}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title={
                        isRead ? "Marcar como no leído" : "Marcar como leído"
                    }
                >
                    {isRead ? (
                        <Eye className="h-3.5 w-3.5" />
                    ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                    )}
                </button>
                <span className="text-sm text-foreground/90 truncate group-hover:text-foreground transition-colors">
                    {chapter.name}
                </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0 ml-4">
                <Clock className="h-3 w-3" />
                {date}
            </div>
        </div>
    );
}

function StatPill({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
}) {
    return (
        <div className="flex items-center gap-2 bg-muted border border-border rounded-lg px-3 py-2">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">
                    {label}
                </p>
                <p className="text-sm font-semibold leading-none">{value}</p>
            </div>
        </div>
    );
}

export default function MangaDetail() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { series, loading, error } = useSeriesDetail(slug ?? "");
    const {
        status: favStatus,
        loading: favLoading,
        save: saveFav,
        remove: removeFav,
    } = useFavorite(series?.id ?? 0);
    const { readIds, toggle: toggleRead } = useReadChapters(series?.id ?? 0);
    const location = useLocation();
    const backUrl = location.state?.from ?? "/";

    const [chaptersReversed, setChaptersReversed] = useState(false);

    const sortedChapters = useMemo(() => {
        if (!series) return [];
        return chaptersReversed
            ? [...series.chapters].reverse()
            : series.chapters;
    }, [series, chaptersReversed]);

    const nextChapter = useMemo(() => {
        if (!series) return null;
        const ascending = [...series.chapters].reverse();
        let lastReadIndex = -1;
        for (let i = 0; i < ascending.length; i++) {
            if (readIds.has(ascending[i].id)) lastReadIndex = i;
        }
        if (lastReadIndex === -1) return ascending[0];
        if (lastReadIndex === ascending.length - 1) return null;
        return ascending[lastReadIndex + 1];
    }, [series, readIds]);

    if (loading) return <MangaDetailSkeleton />;

    if (error || !series) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center px-4">
                <p className="text-4xl">📭</p>
                <h2 className="text-xl font-bold">Serie no encontrada</h2>
                <p className="text-muted-foreground text-sm">
                    No pudimos encontrar esta serie.
                </p>
                <button
                    onClick={() => navigate(-1)}
                    className="text-sm text-primary underline underline-offset-4"
                >
                    Volver al catálogo
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border">
                <div className="container mx-auto flex h-16 items-center px-4 gap-4 max-w-6xl">
                    <SidebarTrigger />
                    <button
                        onClick={() => navigate(backUrl)}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                    >
                        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                        Volver
                    </button>
                    <span className="text-sm font-semibold truncate">
                        {series.name}
                    </span>
                </div>
            </header>

            <div className="container mx-auto px-4 pt-8 pb-8 max-w-6xl">
                <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
                    {/* Columna izquierda */}
                    <div className="md:w-56 lg:w-64 shrink-0">
                        <div className="sticky top-8">
                            <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-border shadow-xl">
                                {series.cover ? (
                                    <img
                                        src={series.cover}
                                        alt={series.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center">
                                        <BookOpen className="h-12 w-12 text-muted-foreground/40" />
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <StatPill
                                    icon={Layers}
                                    label="Capítulos"
                                    value={series.chapterCount}
                                />
                                <StatPill
                                    icon={Hash}
                                    label="Géneros"
                                    value={series.genres.length}
                                />
                            </div>
                            {series.providers.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                                        Fuentes
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {series.providers.map((p) => (
                                            <Badge
                                                key={p.provider}
                                                variant="secondary"
                                                className="text-[10px]"
                                            >
                                                {p.provider}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Columna derecha */}
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start gap-3 mb-2">
                            <h1 className="text-2xl lg:text-3xl font-extrabold leading-tight tracking-tight flex-1">
                                {series.name}
                            </h1>
                            <StatusBadge status={series.status} />
                        </div>

                        {series.genres.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-5">
                                {series.genres.map((genre) => (
                                    <Badge
                                        key={genre}
                                        variant="outline"
                                        className="text-[10px]"
                                    >
                                        {genre}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {/* Botones de acción */}
                        <div className="flex flex-wrap items-center gap-2 mb-5">
                            {series.chapters.length > 0 && (
                                <button
                                    onClick={() => {
                                        const firstChapter =
                                            series.chapters[
                                                series.chapters.length - 1
                                            ];
                                        navigate(
                                            `/manga/${slug}/capitulo/${firstChapter.id}`,
                                            { state: { from: backUrl } },
                                        );
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                                >
                                    <Play className="h-4 w-4" />
                                    Desde el inicio
                                </button>
                            )}

                            {nextChapter && readIds.size > 0 && (
                                <button
                                    onClick={() =>
                                        navigate(
                                            `/manga/${slug}/capitulo/${nextChapter.id}`,
                                            { state: { from: backUrl } },
                                        )
                                    }
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors border border-border"
                                >
                                    <PlayCircle className="h-4 w-4" />
                                    Seguir leyendo · cap. {nextChapter.name}
                                </button>
                            )}
                        </div>

                        {/* Favorito */}
                        {!favLoading && (
                            <div className="flex items-center gap-2 mb-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        favStatus
                                            ? removeFav()
                                            : saveFav("Siguiendo")
                                    }
                                    className={
                                        favStatus
                                            ? "border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                                            : ""
                                    }
                                >
                                    <Heart
                                        className={`h-4 w-4 ${favStatus ? "fill-rose-500" : ""}`}
                                    />
                                    {favStatus ?? "Guardar"}
                                </Button>

                                {favStatus && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-xs"
                                            >
                                                {favStatus}
                                                <ChevronDown className="ml-2 h-3 w-3 opacity-70" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    saveFav("Siguiendo")
                                                }
                                                className="cursor-pointer"
                                            >
                                                Siguiendo
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    saveFav("Terminado")
                                                }
                                                className="cursor-pointer"
                                            >
                                                Terminado
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}

                                {typeof navigator.share === "function" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            navigator.share({
                                                title: series.name,
                                                text:
                                                    series.summary ??
                                                    `Lee ${series.name} en Mangalovers`,
                                                url: window.location.href,
                                            })
                                        }
                                    >
                                        <Share2 className="h-4 w-4" />
                                        Compartir
                                    </Button>
                                )}
                            </div>
                        )}

                        {series.summary && (
                            <div className="mb-8">
                                <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                                    Sinopsis
                                </p>
                                <p className="text-sm text-foreground/80 leading-relaxed">
                                    {series.summary}
                                </p>
                            </div>
                        )}

                        {/* Lista de capítulos */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                                    Capítulos
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-muted-foreground">
                                        {series.chapters.length} disponibles
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() =>
                                            setChaptersReversed((prev) => !prev)
                                        }
                                    >
                                        <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                                        {chaptersReversed
                                            ? "Antiguo → Nuevo"
                                            : "Nuevo → Antiguo"}
                                    </Button>
                                </div>
                            </div>

                            {series.chapters.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                                    No hay capítulos disponibles
                                </div>
                            ) : (
                                <ScrollArea className="h-[420px] rounded-xl border border-border bg-muted/20 pr-2">
                                    <div className="p-2 space-y-0.5">
                                        {sortedChapters.map((chapter) => (
                                            <ChapterRow
                                                key={chapter.id}
                                                chapter={chapter}
                                                isRead={readIds.has(chapter.id)}
                                                onToggleRead={(e) => {
                                                    e.stopPropagation();
                                                    toggleRead(chapter.id);
                                                }}
                                                onClick={() =>
                                                    navigate(
                                                        `/manga/${slug}/capitulo/${chapter.id}`,
                                                        {
                                                            state: {
                                                                from: backUrl,
                                                            },
                                                        },
                                                    )
                                                }
                                            />
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
