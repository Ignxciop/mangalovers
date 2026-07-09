import { SEO } from "@/components/seo";
import { JsonLd } from "@/components/jsonld";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSeriesDetail } from "@/hooks/useSeriesDetail";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CoverImage } from "@/components/coverImage";
import {
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
import { useHeader } from "@/context/headerContext";
import { useFavorite } from "@/hooks/useFavorite";
import { useReadChapters } from "@/hooks/useReadChapters";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect, memo, useCallback } from "react";
import { PullToRefresh } from "@/components/pullToRefresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { SearchBar } from "@/components/search-bar";
import { useAuthStore } from "@/store/authStore";
import { getFriendReadsForSeries, type FriendSeriesRead, type SimpleFriend } from "@/api/friends";
import { FriendAvatars } from "@/components/FriendAvatars";
import { toast } from "sonner";

const AVATAR_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "";

function MangaDetailSkeleton() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-10">
                <Skeleton className="h-5 w-24 mb-10" />
                <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
                    <div className="md:w-56 lg:w-64 shrink-0">
                        <Skeleton className="w-full aspect-[2/3] rounded-xl" />
                    </div>
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

const ChapterRow = memo(function ChapterRow({
    chapter,
    isRead,
    chapterId,
    toggleRead,
    slug,
    backUrl,
    friends = [],
}: {
    chapter: {
        id: number;
        name: string;
        publishedAt: string;
        createdAt: string;
        chapterNumber: number;
    };
    isRead: boolean;
    chapterId: number;
    toggleRead: (id: number) => Promise<void>;
    slug: string;
    backUrl: string;
    friends?: FriendSeriesRead[];
}) {
    const date = new Date(chapter.publishedAt).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
    const navigate = useNavigate();

    const handleToggle = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            toggleRead(chapterId);
        },
        [toggleRead, chapterId],
    );

    const handleClick = useCallback(() => {
        navigate(`/manga/${slug}/capitulo/${chapterId}`, {
            state: { from: backUrl },
        });
    }, [navigate, slug, chapterId, backUrl]);

    return (
        <div
            onClick={handleClick}
            className={`group flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-[background-color,border-color,opacity] duration-150 border ${
                isRead
                    ? "border-transparent hover:bg-muted hover:border-border opacity-50 hover:opacity-100"
                    : "border-transparent hover:bg-muted hover:border-border"
            }`}
        >
            <div className="flex items-center gap-3 min-w-0">
                <span className="text-[11px] font-mono text-muted-foreground w-6 shrink-0 text-right tabular-nums">
                    {chapter.chapterNumber}
                </span>
                <button
                    onClick={handleToggle}
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
                {friends.length > 0 && (
                    <span className="flex -space-x-1.5 shrink-0" title={friends.map((f) => `${f.name} ${f.lastname}`).join(", ")}>
                        {friends.slice(0, 3).map((f) => (
                            <Avatar key={f.userId} className="size-5 rounded-full border-2 border-background">
                                {f.avatarUrl && (
                                    <AvatarImage src={`${AVATAR_BASE}/uploads/avatars/${f.avatarUrl}`} alt={f.name} className="rounded-full object-cover" />
                                )}
                                <AvatarFallback className="rounded-full text-[8px] font-bold bg-primary/10 text-primary">
                                    {f.name[0]}
                                </AvatarFallback>
                            </Avatar>
                        ))}
                        {friends.length > 3 && (
                            <span className="size-5 rounded-full bg-muted text-[8px] font-bold flex items-center justify-center border-2 border-background text-muted-foreground">
                                +{friends.length - 3}
                            </span>
                        )}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0 ml-4">
                <Clock className="h-3 w-3" />
                {date}
            </div>
        </div>
    );
});

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
    const user = useAuthStore((s) => s.user);
    const { series, loading, error, refetch: refetchSeries } = useSeriesDetail(slug ?? "");
    const {
        status: favStatus,
        loading: favLoading,
        save: saveFav,
        remove: removeFav,
    } = useFavorite(series?.id ?? 0);
    const { readIds, toggle: toggleRead } = useReadChapters(
        series?.id ?? 0,
        series?.chapters ?? [],
    );
    const location = useLocation();
    const backUrl = location.state?.from ?? "/";

    const [chaptersReversed, setChaptersReversed] = useState(true);
    const [friendReads, setFriendReads] = useState<FriendSeriesRead[]>([]);

    useEffect(() => {
        if (!series?.id || !user) return;
        getFriendReadsForSeries(series.id)
            .then(setFriendReads)
            .catch(() => setFriendReads([]));
    }, [series?.id, user]);

    const { setContent } = useHeader();

    useEffect(() => {
        setContent({
            center: <SearchBar />,
            right: (
                <button
                    onClick={() => navigate(backUrl)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group shrink-0"
                >
                    <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                    Volver
                </button>
            ),
        });
        return () => setContent({});
    }, [series, backUrl, navigate, setContent]);

    const friendReadsByChapter = useMemo(() => {
        const map = new Map<number, FriendSeriesRead[]>();
        for (const read of friendReads) {
            const arr = map.get(read.chapterId) ?? [];
            arr.push(read);
            map.set(read.chapterId, arr);
        }
        return map;
    }, [friendReads]);

    const friendAvatars = useMemo(() => {
        const seen = new Set<string>();
        const unique: SimpleFriend[] = [];
        for (const read of friendReads) {
            if (!seen.has(read.userId)) {
                seen.add(read.userId);
                unique.push({
                    userId: read.userId,
                    name: read.name,
                    lastname: read.lastname,
                    alias: read.alias,
                    avatarUrl: read.avatarUrl,
                });
            }
        }
        return unique;
    }, [friendReads]);

    const chaptersSorted = useMemo(() => {
        if (!series) return [];
        return [...series.chapters].sort(
            (a, b) => a.chapterNumber - b.chapterNumber,
        );
    }, [series]);

    const sortedChapters = useMemo(() => {
        return chaptersReversed ? [...chaptersSorted].reverse() : chaptersSorted;
    }, [chaptersSorted, chaptersReversed]);

    const nextChapter = useMemo(() => {
        if (!series) return null;
        const ascending = chaptersSorted;
        let lastReadIndex = -1;
        for (let i = 0; i < ascending.length; i++) {
            if (readIds.has(ascending[i].id)) lastReadIndex = i;
        }
        if (lastReadIndex === -1) return ascending[0];
        if (lastReadIndex === ascending.length - 1) return null;
        return ascending[lastReadIndex + 1];
    }, [series, readIds, chaptersSorted]);

    const continueChapter = useMemo(() => {
        return nextChapter;
    }, [nextChapter]);

    const latestChapter = useMemo(() => {
        if (!series) return null;
        return chaptersSorted[chaptersSorted.length - 1] ?? null;
    }, [series, chaptersSorted]);

    const { pull, refreshing } = usePullToRefresh(refetchSeries);

    useEffect(() => {
        document.title = series?.name ?? "Mangalovers";
    }, [series]);

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

    const ogImage = series.cover ?? undefined;

    const jsonLdSeries = {
        "@context": "https://schema.org",
        "@type": "CreativeWorkSeries",
        "name": series.name,
        "description": series.summary?.slice(0, 300) ?? `${series.name} - Lee en Mangalovers`,
        "image": ogImage ?? "https://mangalovers.josenunez.cl/icon-512.png",
        "genre": series.genres,
        ...(series.status && { "status": series.status }),
        "dateModified": series.chapters.length > 0
            ? series.chapters[0].publishedAt
            : undefined,
        "numberOfEpisodes": series.chapters.length,
        "url": `https://mangalovers.josenunez.cl/manga/${slug}`,
    };

    const jsonLdBreadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://mangalovers.josenunez.cl/" },
            { "@type": "ListItem", "position": 2, "name": "Catálogo", "item": "https://mangalovers.josenunez.cl/mangas" },
            { "@type": "ListItem", "position": 3, "name": series.name, "item": `https://mangalovers.josenunez.cl/manga/${slug}` },
        ],
    };

    return (
        <>
            <SEO
                title={series.name}
                description={series.summary?.slice(0, 160) ?? `Lee ${series.name} en Mangalovers. ${series.chapters.length} capítulos disponibles.`}
                ogImage={ogImage}
                ogType="website"
                canonicalPath={`/manga/${slug}`}
            />
            <JsonLd schema={jsonLdSeries} />
            <JsonLd schema={jsonLdBreadcrumb} />
            <PullToRefresh pull={pull} refreshing={refreshing} />
            <div className="min-h-screen bg-background">

                <div className="container mx-auto px-4 pt-8 pb-8">
                    <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
                        {/* Columna izquierda */}
                        <div className="md:w-56 lg:w-64 shrink-0">
                            <div className="sticky top-8">
                                <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/10 dark:border-white/[0.05] shadow-xl ring-1 ring-white/5">
                                    <CoverImage
                                        src={series.cover}
                                        alt={series.name}
                                        fallbackSrc={series.fallbackCover}
                                    />
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    <StatPill
                                        icon={Layers}
                                        label="Capítulos"
                                        value={
                                            latestChapter?.chapterNumber ?? "-"
                                        }
                                    />
                                    <StatPill
                                        icon={Hash}
                                        label="Géneros"
                                        value={series.genres.length}
                                    />
                                </div>
                                {user?.role === "ADMIN" && series.providers.length > 0 && (
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
                                {series.type && (
                                    <Badge
                                        variant="secondary"
                                        className="text-[11px] px-2.5 py-0.5 font-medium capitalize"
                                    >
                                        {series.type}
                                    </Badge>
                                )}
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
                                                chaptersSorted[0];
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

                                {continueChapter && readIds.size > 0 && (
                                    <button
                                        onClick={() => {
                                            navigate(
                                                `/manga/${slug}/capitulo/${continueChapter.id}`,
                                                { state: { from: backUrl } },
                                            );
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors border border-border"
                                    >
                                        <PlayCircle className="h-4 w-4" />
                                        Seguir leyendo · cap. {continueChapter.name}
                                    </button>
                                )}
                            </div>

                            {/* Favorito */}
                            {!favLoading && (
                                <div className="flex items-center gap-2 mb-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                            try {
                                                if (favStatus) {
                                                    await removeFav();
                                                    toast.success("Favorito eliminado");
                                                } else {
                                                    await saveFav("Siguiendo");
                                                    toast.success("Añadido a favoritos");
                                                }
                                            } catch {
                                                toast.error("Error al cambiar favorito");
                                            }
                                        }}
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
                                                    onClick={async () => {
                                                        try {
                                                            await saveFav("Siguiendo");
                                                            toast.success("Marcado como Siguiendo");
                                                        } catch {
                                                            toast.error("Error al actualizar");
                                                        }
                                                    }}
                                                    className="cursor-pointer"
                                                >
                                                    Siguiendo
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={async () => {
                                                        try {
                                                            await saveFav("Terminado");
                                                            toast.success("Marcado como Terminado");
                                                        } catch {
                                                            toast.error("Error al actualizar");
                                                        }
                                                    }}
                                                    className="cursor-pointer"
                                                >
                                                    Terminado
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                            if (typeof navigator.share === "function") {
                                                const shareData: ShareData = {
                                                    title: series.name,
                                                    text: series.summary ?? `Lee ${series.name} en Mangalovers`,
                                                    url: window.location.href,
                                                };
                                                try {
                                                    if (!series.cover) throw new Error();
                                                    const res = await fetch(series.cover);
                                                    const blob = await res.blob();
                                                    const file = new File([blob], `${series.name}.jpg`, { type: blob.type });
                                                    shareData.files = [file];
                                                } catch { /* ignorar */ }
                                                if (navigator.canShare?.(shareData)) {
                                                    await navigator.share(shareData);
                                                } else {
                                                    await navigator.share({ title: shareData.title, text: shareData.text, url: shareData.url });
                                                }
                                            } else {
                                                await navigator.clipboard.writeText(window.location.href);
                                                toast.success("Enlace copiado al portapapeles");
                                            }
                                        }}
                                    >
                                        <Share2 className="h-4 w-4" />
                                        Compartir
                                    </Button>
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
                                    <div className="flex items-center gap-2">
                                        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                                            Capítulos
                                        </p>
                                        <FriendAvatars friends={friendAvatars} size="xs" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                            onClick={() =>
                                                setChaptersReversed(
                                                    (prev) => !prev,
                                                )
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
                                                    isRead={readIds.has(
                                                        chapter.id,
                                                    )}
                                                    chapterId={chapter.id}
                                                    toggleRead={toggleRead}
                                                    slug={slug ?? ""}
                                                    backUrl={backUrl}
                                                    friends={friendReadsByChapter.get(chapter.id) ?? []}
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
        </>
    );
}
