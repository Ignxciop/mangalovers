import { SEO } from "@/components/seo";
import { useEffect, useState, useMemo, memo, useCallback, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { fetchFavorites, deleteFavorite, upsertFavorite } from "@/api/manga";
import type { Favorite } from "@/types/manga";
import { Skeleton } from "@/components/ui/skeleton";
import { CoverImage } from "@/components/coverImage";
import { timeAgo } from "@/lib/date";
import {
    BookOpen,
    Heart,
    Check,
    Clock,
    Eye,
    Search,
    SlidersHorizontal,
} from "lucide-react";
import { useHeader } from "@/context/headerContext";
import { useIsMobile } from "@/hooks/use-mobile";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { FilterDrawer } from "@/components/FilterDrawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PullToRefresh } from "@/components/pullToRefresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { MangaPagination } from "@/components/MangaPagination";
import { getSeriesActivity } from "@/api/friends";
import { FriendAvatars } from "@/components/FriendAvatars";
import { DebouncedSearchInput } from "@/components/DebouncedSearchInput";
import { toast } from "sonner";

function chaptersLeft(fav: Favorite): number {
    const read = parseFloat(fav.lastReadChapterName ?? "0");
    const available = parseFloat(fav.lastAvailableChapterName ?? "0");
    return Math.max(0, available - read);
}

function isUpToDate(fav: Favorite): boolean {
    return chaptersLeft(fav) === 0;
}

type StatusFilter = "Todos" | "Siguiendo" | "Terminado";
type TypeFilter = "" | "manga" | "manhwa" | "manhua";
type ProgressFilter = "todos" | "al-dia" | "pendiente";
type SortBy =
    | "reciente"
    | "updated"
    | "pendiente-asc"
    | "pendiente-desc"
    | "nombre"
    | "za";

const FavoriteListItem = memo(function FavoriteListItem({
    fav,
    fromUrl,
    onRequestRemove,
    onStatusChange,
    friends,
}: {
    fav: Favorite;
    fromUrl: string;
    onRequestRemove: (seriesId: number) => void;
    onStatusChange: (seriesId: number, status: string) => void;
    friends: { userId: string; name: string; lastname: string; alias: string | null; avatarUrl: string | null }[];
}) {
    return (
        <div className="group animate-fade-in-up">
            <Link
                to={`/manga/${fav.series.slug}`}
                state={{ from: fromUrl }}
                className="relative block aspect-[3/4] rounded-lg overflow-hidden border border-white/10 dark:border-white/[0.05] shadow-lg cursor-pointer transition-all duration-200 group-hover:scale-[1.02] group-hover:shadow-[0_0_25px_-5px] group-hover:shadow-brand/30 group-hover:border-brand/20"
            >
                <CoverImage
                    src={fav.series.cover}
                    alt={fav.series.name}
                    fallbackSrc={fav.series.fallbackCover}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-t from-brand/15 via-transparent to-transparent" />

                {isUpToDate(fav) &&
                    fav.lastReadChapterName && (
                        <div className="absolute bottom-2 left-2 bg-primary/90 text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            {fav.status === "Terminado"
                                ? "Finalizado"
                                : "Al día"}
                        </div>
                    )}
                {friends.length > 0 && (
                    <div className="absolute bottom-2 right-2 z-10">
                        <FriendAvatars friends={friends} size="xs" />
                    </div>
                )}
            </Link>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRequestRemove(fav.seriesId);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-rose-400 transition-opacity hover:bg-black/70 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                title="Quitar de favoritos"
                style={{ position: "absolute" }}
            >
                <Heart className="h-3.5 w-3.5 fill-rose-400" />
            </button>

            <div className="mt-3 space-y-2">
                <Link
                    to={`/manga/${fav.series.slug}`}
                    state={{ from: fromUrl }}
                    className="block text-sm font-bold truncate leading-none hover:text-primary transition-colors"
                    title={fav.series.name}
                >
                    {fav.series.name}
                </Link>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <Eye className="h-2.5 w-2.5" />
                        {fav.lastReadChapterName ?? "0"}
                        <span className="opacity-40">/</span>
                        <BookOpen className="h-2.5 w-2.5" />
                        {fav.lastAvailableChapterName ??
                            fav.series.chapterCount}
                    </span>
                    {fav.series
                        .lastChapterPublishedAt && (
                        <span className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {timeAgo(
                                fav.series
                                    .lastChapterPublishedAt,
                            )}
                        </span>
                    )}
                </div>

                {fav.lastAvailableChapterName && (
                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary rounded-full transition-[width]"
                            style={{
                                width: `${Math.min(
                                    ((fav.lastReadChapterName
                                        ? parseFloat(
                                              fav.lastReadChapterName,
                                          )
                                        : 0
                                    ) /
                                        parseFloat(
                                            fav.lastAvailableChapterName,
                                        )) *
                                        100,
                                    100,
                                )}%`,
                            }}
                        />
                    </div>
                )}

                {fav.status && (
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            asChild
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-[10px] h-7 px-2 justify-between"
                            >
                                {fav.status}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-[140px]"
                        >
                            <DropdownMenuItem
                                onClick={() =>
                                    onStatusChange(
                                        fav.seriesId,
                                        "Siguiendo",
                                    )
                                }
                                className="flex justify-between cursor-pointer"
                            >
                                Siguiendo
                                {fav.status ===
                                    "Siguiendo" && (
                                    <Check className="h-3 w-3" />
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() =>
                                    onStatusChange(
                                        fav.seriesId,
                                        "Terminado",
                                    )
                                }
                                className="flex justify-between cursor-pointer"
                            >
                                Terminado
                                {fav.status ===
                                    "Terminado" && (
                                    <Check className="h-3 w-3" />
                                )}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    );
});

export default function FavoritesList() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [loading, setLoading] = useState(true);
    const [removingId, setRemovingId] = useState<number | null>(null);

    const searchText = searchParams.get("search") ?? "";
    const statusFilter = (searchParams.get("status") ??
        "Todos") as StatusFilter;
    const typeFilter = (searchParams.get("type") ?? "") as TypeFilter;
    const progressFilter = (searchParams.get("progress") ??
        "todos") as ProgressFilter;
    const sortBy = (searchParams.get("sort") ?? "reciente") as SortBy;
    const page = Number(searchParams.get("page") ?? "1");

    const activeFiltersCount = [
        statusFilter !== "Todos" ? statusFilter : "",
        typeFilter,
        progressFilter !== "todos" ? progressFilter : "",
        sortBy !== "reciente" ? sortBy : "",
        searchText.trim(),
    ].filter(Boolean).length;

    const handleRefresh = useCallback(async () => {
        try {
            const data = await fetchFavorites();
            setFavorites(data);
        } catch {
            setFavorites([]);
        }
    }, []);

    const { pull, refreshing } = usePullToRefresh(handleRefresh);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const { setContent, setSearchMode, setSearchContent } = useHeader();
    const isMobile = useIsMobile();
    const favGridRef = useRef<HTMLDivElement | null>(null);

    const [columns, setColumns] = useState(() => {
        const w = window.innerWidth;
        if (w >= 1480) return 8;
        if (w >= 880) return 5;
        if (w >= 560) return 4;
        return 3;
    });

    const gridColumns = isMobile ? 2 : columns;

    useEffect(() => {
        const onResize = () => {
            const w = window.innerWidth;
            setColumns(
                w >= 1480 ? 8 :
                w >= 880 ? 5 :
                w >= 560 ? 4 :
                3
            );
        };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        if (isMobile) {
            setContent({
                right: (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setSearchContent(<DebouncedSearchInput />);
                                setSearchMode(true);
                            }}
                            className="p-2 rounded-lg hover:bg-accent transition-colors"
                            aria-label="Buscar series"
                        >
                            <Search className="h-5 w-5" />
                        </button>
                        <Button
                            variant="outline"
                            className="shrink-0 relative"
                            onClick={() => setFilterDrawerOpen(true)}
                        >
                            <SlidersHorizontal className="mr-2 h-4 w-4" />
                            Filtros
                            {activeFiltersCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center size-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </Button>
                    </div>
                ),
            });
        } else {
            setContent({
                center: (
                    <div className="relative w-[512px] max-w-full">
                        <DebouncedSearchInput />
                    </div>
                ),
                right: (
                    <Button
                        variant="outline"
                        className="shrink-0 relative"
                        onClick={() => setFilterDrawerOpen(true)}
                    >
                        <SlidersHorizontal className="mr-2 h-4 w-4" />
                        Filtros
                        {activeFiltersCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center size-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                {activeFiltersCount}
                            </span>
                        )}
                    </Button>
                ),
            });
        }
        return () => {
            setContent({});
        };
    }, [isMobile, activeFiltersCount, setContent, setFilterDrawerOpen]);

    useEffect(() => {
        return () => {
            setSearchMode(false);
            setSearchContent(null);
        };
    }, [setSearchMode, setSearchContent]);

    useEffect(() => {
        fetchFavorites()
            .then(setFavorites)
            .catch(() => setFavorites([]))
            .finally(() => setLoading(false));
    }, []);

    const [activityMap, setActivityMap] = useState<Record<number, { userId: string; name: string; lastname: string; alias: string | null; avatarUrl: string | null }[]>>({});

    useEffect(() => {
        if (favorites.length === 0) return;
        const ids = favorites.map((f) => f.seriesId);
        getSeriesActivity(ids).then(setActivityMap).catch(() => setActivityMap({}));
    }, [favorites]);

    function setStatusFilter(value: StatusFilter) {
        setSearchParams((prev) => {
            if (value === "Todos") prev.delete("status");
            else prev.set("status", value);

            prev.set("page", "1");

            return prev;
        });
    }

    function setProgressFilter(value: ProgressFilter) {
        setSearchParams((prev) => {
            if (value === "todos") prev.delete("progress");
            else prev.set("progress", value);

            prev.set("page", "1");

            return prev;
        });
    }

    function setTypeFilter(value: TypeFilter) {
        setSearchParams((prev) => {
            if (!value) prev.delete("type");
            else prev.set("type", value);

            prev.set("page", "1");

            return prev;
        });
    }

    function setSortBy(value: SortBy) {
        setSearchParams((prev) => {
            if (value === "reciente") prev.delete("sort");
            else prev.set("sort", value);

            prev.set("page", "1");

            return prev;
        });
    }

    function clearFilters() {
        setSearchParams({ page: "1" });
    }

    const handleStatusChange = useCallback(
        async (seriesId: number, newStatus: string) => {
            try {
                await upsertFavorite(seriesId, newStatus);
                setFavorites((prev) =>
                    prev.map((f) =>
                        f.seriesId === seriesId
                            ? { ...f, status: newStatus as "Siguiendo" | "Terminado" }
                            : f,
                    ),
                );
                toast.success(`Marcado como ${newStatus}`);
            } catch {
                toast.error("Error al cambiar estado");
            }
        },
        [],
    );

    const handleRemove = useCallback(async (seriesId: number) => {
        try {
            await deleteFavorite(seriesId);
            setFavorites((prev) => prev.filter((f) => f.seriesId !== seriesId));
            toast.success("Favorito eliminado");
        } catch {
            toast.error("Error al eliminar favorito");
        }
    }, []);

    const filtered = useMemo(() => {
        let result = [...favorites];

        if (searchText.trim()) {
            result = result.filter((f) =>
                f.series.name
                    .toLowerCase()
                    .includes(searchText.toLowerCase().trim()),
            );
        }

        if (statusFilter !== "Todos") {
            result = result.filter((f) => f.status === statusFilter);
        }

        if (typeFilter) {
            result = result.filter((f) => f.series.type === typeFilter);
        }

        if (progressFilter === "al-dia") {
            result = result.filter(isUpToDate);
        } else if (progressFilter === "pendiente") {
            result = result.filter((f) => !isUpToDate(f));
        }

        if (sortBy === "pendiente-asc") {
            result.sort((a, b) => chaptersLeft(a) - chaptersLeft(b));
        } else if (sortBy === "pendiente-desc") {
            result.sort((a, b) => chaptersLeft(b) - chaptersLeft(a));
        } else if (sortBy === "nombre") {
            result.sort((a, b) => a.series.name.localeCompare(b.series.name));
        } else if (sortBy === "za") {
            result.sort((a, b) => b.series.name.localeCompare(a.series.name));
        } else if (sortBy === "updated") {
            result.sort((a, b) => {
                const aDate = a.series.lastChapterPublishedAt
                    ? new Date(a.series.lastChapterPublishedAt).getTime()
                    : 0;

                const bDate = b.series.lastChapterPublishedAt
                    ? new Date(b.series.lastChapterPublishedAt).getTime()
                    : 0;

                return bDate - aDate;
            });
        } else if (sortBy === "reciente") {
            result.sort((a, b) => {
                const aDate = new Date(a.updatedAt).getTime();
                const bDate = new Date(b.updatedAt).getTime();

                return bDate - aDate;
            });
        }

        return result;
    }, [favorites, statusFilter, typeFilter, progressFilter, sortBy, searchText]);

    const ITEMS_PER_PAGE = columns * 4;

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

    const paginatedFavorites = filtered.slice(
        (page - 1) * ITEMS_PER_PAGE,
        page * ITEMS_PER_PAGE,
    );

    function setPage(newPage: number) {
        setSearchParams((prev) => {
            prev.set("page", String(newPage));
            return prev;
        });
    }

    const fromUrl = useMemo(
        () => `/favoritos?${searchParams.toString()}`,
        [searchParams],
    );

    return (
        <>
            <SEO
                title="Mis Favoritos"
                description="Gestiona tu lista de mangas y manhwas favoritos en Mangalovers. Sigue tu progreso y descubre nuevos capítulos."
                canonicalPath="/favoritos"
            />
            <PullToRefresh pull={pull} refreshing={refreshing} />
            <div className="min-h-screen bg-background">
                <FilterDrawer
                    open={filterDrawerOpen}
                    onOpenChange={setFilterDrawerOpen}
                    activeFiltersCount={activeFiltersCount}
                    hideTrigger
                    title="Filtros"
                    onClearAll={clearFilters}
                >
                    <div className="px-6 py-5 border-b border-border">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            Ordenar por
                        </p>
                        <Select
                            value={sortBy}
                            onValueChange={(v) => setSortBy(v as SortBy)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="reciente">
                                    Favorito más reciente
                                </SelectItem>
                                <SelectItem value="pendiente-asc">
                                    Menos capítulos pendientes
                                </SelectItem>
                                <SelectItem value="pendiente-desc">
                                    Más capítulos pendientes
                                </SelectItem>
                                <SelectItem value="updated">
                                    Actualización reciente
                                </SelectItem>
                                <SelectItem value="nombre">
                                    A → Z
                                </SelectItem>
                                <SelectItem value="za">
                                    Z → A
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="px-6 py-5 border-b border-border">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            Estado
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {(["Todos", "Siguiendo", "Terminado"] as const).map((f) => (
                                <Badge
                                    key={f}
                                    variant={statusFilter === f ? "default" : "outline"}
                                    className="cursor-pointer px-3 py-1 text-xs"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setStatusFilter(f)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            setStatusFilter(f);
                                        }
                                    }}
                                >
                                    {f}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="px-6 py-5 border-b border-border">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            Tipo
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { label: "Todos", value: "" },
                                { label: "Manga", value: "manga" },
                                { label: "Manhwa", value: "manhwa" },
                                { label: "Manhua", value: "manhua" },
                            ].map(({ label, value }) => (
                                <Badge
                                    key={value}
                                    variant={typeFilter === value ? "default" : "outline"}
                                    className="cursor-pointer px-3 py-1 text-xs"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setTypeFilter(typeFilter === value ? "" : (value as TypeFilter))}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            setTypeFilter(typeFilter === value ? "" : (value as TypeFilter));
                                        }
                                    }}
                                >
                                    {label}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="px-6 py-5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            Progreso de lectura
                        </p>
                        <div className="overflow-y-auto">
                            {[
                                { value: "todos", label: "Todos" },
                                { value: "al-dia", label: "Al día" },
                                { value: "pendiente", label: "Con capítulos pendientes" },
                            ].map(({ value, label }, idx, arr) => (
                                <div
                                    key={value}
                                    role="button"
                                    tabIndex={0}
                                    className={`flex items-center justify-between py-2.5 cursor-pointer group transition-colors ${
                                        idx !== arr.length - 1 ? "border-b border-border/40" : ""
                                    }`}
                                    onClick={() => setProgressFilter(value as ProgressFilter)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            setProgressFilter(value as ProgressFilter);
                                        }
                                    }}
                                >
                                    <span className={`text-sm transition-colors ${
                                        progressFilter === value
                                            ? "text-foreground font-medium"
                                            : "text-muted-foreground group-hover:text-foreground"
                                    }`}>
                                        {label}
                                    </span>
                                    {progressFilter === value && (
                                        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </FilterDrawer>

                <main className="w-full px-4 py-8">
                    {!loading && filtered.length > 0 && (
                        <div className="mb-8">
                            <MangaPagination
                                page={page}
                                totalPages={totalPages}
                                setPage={setPage}
                            />
                        </div>
                    )}

                    {loading && (
                        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}>
                            {Array.from({ length: columns * 2 }).map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="aspect-[2/3] rounded-xl" />
                                    <Skeleton className="h-4 w-3/4" />
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                            <Heart className="h-12 w-12 text-muted-foreground/30" />
                            <p className="text-muted-foreground text-sm">
                                {activeFiltersCount > 0
                                    ? "No hay favoritos con estos filtros"
                                    : "Aún no tienes favoritos guardados"}
                            </p>
                            {activeFiltersCount > 0 ? (
                                <button
                                    onClick={clearFilters}
                                    className="text-sm text-primary underline underline-offset-4"
                                >
                                    Limpiar filtros
                                </button>
                            ) : (
                                <button
                                    onClick={() => navigate("/mangas")}
                                    className="text-sm text-primary underline underline-offset-4"
                                >
                                    Explorar catálogo
                                </button>
                            )}
                        </div>
                    )}

                    {!loading && filtered.length > 0 && (
                        <>
                            <div ref={favGridRef} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}>
                                {paginatedFavorites.map((fav) => (
                                    <FavoriteListItem
                                        key={fav.id}
                                        fav={fav}
                                        fromUrl={fromUrl}
                                        onRequestRemove={setRemovingId}
                                        onStatusChange={handleStatusChange}
                                        friends={activityMap[fav.seriesId] ?? []}
                                    />
                                ))}
                            </div>

                            <div className="mt-8">
                                <MangaPagination
                                    page={page}
                                    totalPages={totalPages}
                                    setPage={setPage}
                                />
                            </div>
                        </>
                    )}
                </main>
            </div>

            <AlertDialog
                open={removingId !== null}
                onOpenChange={(open) => {
                    if (!open) setRemovingId(null);
                }}
            >
                <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            ¿Quitar de favoritos?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {removingId !== null && (
                                <>
                                    Se eliminará{" "}
                                    <span className="font-medium text-foreground">
                                        {
                                            favorites.find(
                                                (f) =>
                                                    f.seriesId === removingId,
                                            )?.series.name
                                        }
                                    </span>{" "}
                                    de tu lista de favoritos.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRemovingId(null)}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() => {
                                if (removingId !== null) {
                                    handleRemove(removingId);
                                    setRemovingId(null);
                                }
                            }}
                        >
                            Quitar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}


