import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchFavorites, deleteFavorite, upsertFavorite } from "@/api/manga";
import type { Favorite } from "@/types/manga";
import { Skeleton } from "@/components/ui/skeleton";
import {
    BookOpen,
    Heart,
    Check,
    Clock,
    Eye,
    SlidersHorizontal,
    Search,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    const days = Math.floor(diff / 86400);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (diff < 86400) return "Hoy";
    if (days === 1) return "Ayer";
    if (days <= 7) return `${days} días`;
    if (weeks === 1) return "1 semana";
    if (weeks <= 4) return `${weeks} semanas`;
    if (months === 1) return "1 mes";
    if (months <= 11) return `${months} meses`;
    if (years === 1) return "1 año";
    return `${years} años`;
}

function chaptersLeft(fav: Favorite): number {
    const read = parseFloat(fav.lastReadChapterName ?? "0");
    const available = parseFloat(fav.lastAvailableChapterName ?? "0");
    return Math.max(0, available - read);
}

function isUpToDate(fav: Favorite): boolean {
    return chaptersLeft(fav) === 0;
}

type StatusFilter = "Todos" | "Siguiendo" | "Terminado";
type ProgressFilter = "todos" | "al-dia" | "pendiente";
type SortBy = "reciente" | "pendiente-asc" | "pendiente-desc" | "nombre";

export default function FavoritesList() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [loading, setLoading] = useState(true);

    const searchText = searchParams.get("search") ?? "";
    const statusFilter = (searchParams.get("status") ??
        "Todos") as StatusFilter;
    const progressFilter = (searchParams.get("progress") ??
        "todos") as ProgressFilter;
    const sortBy = (searchParams.get("sort") ?? "reciente") as SortBy;

    useEffect(() => {
        fetchFavorites()
            .then(setFavorites)
            .finally(() => setLoading(false));
    }, []);

    function setSearch(value: string) {
        setSearchParams((prev) => {
            if (value) prev.set("search", value);
            else prev.delete("search");
            return prev;
        });
    }

    function setStatusFilter(value: StatusFilter) {
        setSearchParams((prev) => {
            if (value === "Todos") prev.delete("status");
            else prev.set("status", value);
            return prev;
        });
    }

    function setProgressFilter(value: ProgressFilter) {
        setSearchParams((prev) => {
            if (value === "todos") prev.delete("progress");
            else prev.set("progress", value);
            return prev;
        });
    }

    function setSortBy(value: SortBy) {
        setSearchParams((prev) => {
            if (value === "reciente") prev.delete("sort");
            else prev.set("sort", value);
            return prev;
        });
    }

    function clearFilters() {
        setSearchParams({});
    }

    async function handleStatusChange(seriesId: number, newStatus: string) {
        await upsertFavorite(seriesId, newStatus);
        setFavorites((prev) =>
            prev.map((f) =>
                f.seriesId === seriesId
                    ? { ...f, status: newStatus as "Siguiendo" | "Terminado" }
                    : f,
            ),
        );
    }

    async function handleRemove(seriesId: number) {
        await deleteFavorite(seriesId);
        setFavorites((prev) => prev.filter((f) => f.seriesId !== seriesId));
    }

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
        }

        return result;
    }, [favorites, statusFilter, progressFilter, sortBy, searchText]);

    const activeFiltersCount = [
        statusFilter !== "Todos" ? statusFilter : "",
        progressFilter !== "todos" ? progressFilter : "",
        sortBy !== "reciente" ? sortBy : "",
        searchText.trim(),
    ].filter(Boolean).length;

    const fromUrl = `/favoritos?${searchParams.toString()}`;

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border">
                <div className="container mx-auto flex h-16 items-center px-4 gap-4 max-w-5xl">
                    <SidebarTrigger />
                    <h1 className="text-lg font-bold shrink-0">
                        Mis favoritos
                    </h1>
                    <div className="flex-1 flex items-center relative">
                        <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar favorito..."
                            className="pl-9 w-full bg-secondary/50"
                            value={searchText}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="relative"
                            >
                                <SlidersHorizontal className="mr-2 h-4 w-4" />
                                Filtros
                                {activeFiltersCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </Button>
                        </SheetTrigger>

                        <SheetContent className="flex flex-col gap-0 p-0">
                            <SheetHeader className="px-6 py-5 border-b border-border">
                                <SheetTitle className="text-base">
                                    Filtros
                                </SheetTitle>
                            </SheetHeader>

                            <div className="flex-1 overflow-y-auto">
                                <div className="px-6 py-5 border-b border-border">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                        Ordenar por
                                    </p>
                                    <Select
                                        value={sortBy}
                                        onValueChange={(v) =>
                                            setSortBy(v as SortBy)
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="reciente">
                                                Más reciente
                                            </SelectItem>
                                            <SelectItem value="pendiente-asc">
                                                Menos capítulos pendientes
                                            </SelectItem>
                                            <SelectItem value="pendiente-desc">
                                                Más capítulos pendientes
                                            </SelectItem>
                                            <SelectItem value="nombre">
                                                A → Z
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="px-6 py-5 border-b border-border">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                        Estado
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {(
                                            [
                                                "Todos",
                                                "Siguiendo",
                                                "Terminado",
                                            ] as const
                                        ).map((f) => (
                                            <Badge
                                                key={f}
                                                variant={
                                                    statusFilter === f
                                                        ? "default"
                                                        : "outline"
                                                }
                                                className="cursor-pointer px-3 py-1 text-xs"
                                                onClick={() =>
                                                    setStatusFilter(f)
                                                }
                                            >
                                                {f}
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
                                            {
                                                value: "al-dia",
                                                label: "Al día",
                                            },
                                            {
                                                value: "pendiente",
                                                label: "Con capítulos pendientes",
                                            },
                                        ].map(({ value, label }, idx, arr) => (
                                            <div
                                                key={value}
                                                className={`flex items-center justify-between py-2.5 cursor-pointer group transition-colors ${
                                                    idx !== arr.length - 1
                                                        ? "border-b border-border/40"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    setProgressFilter(
                                                        value as ProgressFilter,
                                                    )
                                                }
                                            >
                                                <span
                                                    className={`text-sm transition-colors ${
                                                        progressFilter === value
                                                            ? "text-foreground font-medium"
                                                            : "text-muted-foreground group-hover:text-foreground"
                                                    }`}
                                                >
                                                    {label}
                                                </span>
                                                {progressFilter === value && (
                                                    <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {activeFiltersCount > 0 && (
                                <div className="px-6 py-4 border-t border-border">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={clearFilters}
                                    >
                                        Limpiar todos los filtros
                                    </Button>
                                </div>
                            )}
                        </SheetContent>
                    </Sheet>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-5xl">
                {loading && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {Array.from({ length: 10 }).map((_, i) => (
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {filtered.map((fav) => (
                            <div key={fav.id} className="group">
                                {/* Card imagen — <a> envuelve solo la imagen */}
                                <a
                                    href={`/manga/${fav.series.slug}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        navigate(`/manga/${fav.series.slug}`, {
                                            state: { from: fromUrl },
                                        });
                                    }}
                                    className="relative block aspect-[2/3] rounded-xl overflow-hidden border border-border shadow-lg cursor-pointer transition-transform group-hover:scale-[1.02]"
                                >
                                    {fav.series.cover ? (
                                        <img
                                            src={fav.series.cover}
                                            alt={fav.series.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-muted flex items-center justify-center">
                                            <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    {isUpToDate(fav) &&
                                        fav.lastReadChapterName && (
                                            <div className="absolute bottom-2 left-2 bg-primary/90 text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                                {fav.status === "Terminado"
                                                    ? "Finalizado"
                                                    : "Al día"}
                                            </div>
                                        )}
                                </a>

                                {/* Botón quitar — fuera del <a> para no interferir */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove(fav.seriesId);
                                    }}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-rose-400 transition-opacity hover:bg-black/70 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                    title="Quitar de favoritos"
                                    style={{ position: "absolute" }}
                                >
                                    <Heart className="h-3.5 w-3.5 fill-rose-400" />
                                </button>

                                <div className="mt-2 space-y-1.5">
                                    <a
                                        href={`/manga/${fav.series.slug}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            navigate(
                                                `/manga/${fav.series.slug}`,
                                                {
                                                    state: { from: fromUrl },
                                                },
                                            );
                                        }}
                                        className="block text-sm font-semibold truncate hover:text-primary transition-colors"
                                        title={fav.series.name}
                                    >
                                        {fav.series.name}
                                    </a>

                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                        <span className="flex items-center gap-1.5">
                                            <Eye className="h-2.5 w-2.5" />
                                            {fav.lastReadChapterName ?? "0"}
                                            <span className="opacity-40">
                                                /
                                            </span>
                                            <BookOpen className="h-2.5 w-2.5" />
                                            {fav.lastAvailableChapterName ??
                                                fav.series.chapterCount}
                                        </span>
                                        {fav.series.lastChapterPublishedAt && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-2.5 w-2.5" />
                                                {timeAgo(
                                                    fav.series
                                                        .lastChapterPublishedAt,
                                                )}
                                            </span>
                                        )}
                                    </div>

                                    {fav.lastReadChapterName &&
                                        fav.lastAvailableChapterName && (
                                            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full transition-all"
                                                    style={{
                                                        width: `${Math.min(
                                                            (parseFloat(
                                                                fav.lastReadChapterName,
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
                                            <DropdownMenuTrigger asChild>
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
                                                        handleStatusChange(
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
                                                        handleStatusChange(
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
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
