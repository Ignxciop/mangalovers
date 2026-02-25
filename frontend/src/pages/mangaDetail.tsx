import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSeriesDetail } from "@/hooks/useSeriesDetail";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
                "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        },
        Finalizado: {
            label: "Finalizado",
            className: "bg-sky-500/10 text-sky-400 border-sky-500/30",
        },
        "Pausado por el autor (Hiatus)": {
            label: "Hiatus",
            className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        },
        "Abandonado por el scan": {
            label: "Abandonado",
            className: "bg-rose-500/10 text-rose-400 border-rose-500/30",
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
            className="group flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-all duration-150 hover:bg-white/5 border border-transparent hover:border-white/10"
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

            {/* DERECHA */}
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
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
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
    const backUrl = location.state?.from ?? "/mangas";

    if (loading) return <MangaDetailSkeleton />;

    if (error || !series) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center px-4">
                <p className="text-4xl">📭</p>
                <h2 className="text-xl font-bold">Serie no encontrada</h2>
                <p className="text-muted-foreground text-sm">
                    No pudimos encontrar esta serie. Puede que haya sido
                    eliminada o el enlace sea incorrecto.
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
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="flex">
                    <SidebarTrigger />
                    <button
                        onClick={() => navigate(backUrl)}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
                    >
                        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                        Volver
                    </button>
                </div>
                <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
                    <div className="md:w-56 lg:w-64 shrink-0">
                        <div className="sticky top-8">
                            <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
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
                                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
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
                                        className="text-[10px] border-primary/30 text-primary/80"
                                    >
                                        {genre}
                                    </Badge>
                                ))}
                            </div>
                        )}
                        {series.chapters.length > 0 && (
                            <button
                                onClick={() => {
                                    const firstChapter =
                                        series.chapters[
                                            series.chapters.length - 1
                                        ];
                                    navigate(
                                        `/manga/${slug}/capitulo/${firstChapter.id}`,
                                        {
                                            state: { from: backUrl }, // 👈 faltaba esto
                                        },
                                    );
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors mb-5"
                            >
                                <Play className="h-4 w-4" />
                                Leer desde el capítulo 1
                            </button>
                        )}
                        {!favLoading && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() =>
                                        favStatus
                                            ? removeFav()
                                            : saveFav("Siguiendo")
                                    }
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                                        favStatus
                                            ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                                            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                                    }`}
                                >
                                    <Heart
                                        className={`h-4 w-4 ${favStatus ? "fill-rose-400" : ""}`}
                                    />
                                    {favStatus ?? "Guardar"}
                                </button>
                                {favStatus && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-xs bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                                            >
                                                {favStatus}
                                                <ChevronDown className="ml-2 h-3 w-3 opacity-70" />
                                            </Button>
                                        </DropdownMenuTrigger>

                                        <DropdownMenuContent
                                            align="end"
                                            className="bg-popover border border-border"
                                        >
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
                            </div>
                        )}
                        <Separator className="mb-5 opacity-20" />
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
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                                    Capítulos
                                </p>
                                <span className="text-[11px] text-muted-foreground">
                                    {series.chapters.length} disponibles
                                </span>
                            </div>

                            {series.chapters.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-white/10 rounded-xl">
                                    No hay capítulos disponibles
                                </div>
                            ) : (
                                <ScrollArea className="h-[420px] rounded-xl border border-white/10 bg-white/[0.02] pr-2">
                                    <div className="p-2 space-y-0.5">
                                        {series.chapters.map((chapter) => (
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
