import { SEO } from "@/components/seo";
import { JsonLd } from "@/components/jsonld";
import { Search, BookOpen, Eye, Heart } from "lucide-react";
import { CoverImage } from "@/components/coverImage";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FilterDrawer } from "@/components/FilterDrawer";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useEffect, useState, memo, useMemo } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useMangaList } from "@/hooks/useMangaList";
import { Link, useSearchParams } from "react-router-dom";
import { fetchGenres } from "@/api/manga";
import { getLocalLastReadName } from "@/hooks/useReadChapters";
import { useFavoriteIds } from "@/hooks/useFavoriteIds";
import { MangaPagination } from "@/components/MangaPagination";
import type { Manga } from "@/types/manga";
import { useAuthStore } from "@/store/authStore";
import { getSeriesActivity } from "@/api/friends";
import { FriendAvatars } from "@/components/FriendAvatars";

const MangaListItem = memo(function MangaListItem({
    manga,
    isFavorited,
    backUrl,
    friends,
}: {
    manga: Manga;
    isFavorited: boolean;
    backUrl: string;
    friends: { userId: string; name: string; lastname: string; alias: string | null; avatarUrl: string | null }[];
}) {
    return (
        <div className="group animate-fade-in-up">
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-white/10 dark:border-white/[0.05] bg-muted shadow-sm transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-[0_0_25px_-5px] group-hover:shadow-brand/30 group-hover:border-brand/20">
                <Link
                    to={`/manga/${manga.slug}`}
                    state={{ from: backUrl }}
                    className="absolute inset-0 z-0"
                    aria-label={manga.name}
                />
                {isFavorited && (
                    <div className="absolute top-2 left-2 z-10 p-1.5 rounded-full bg-black/50 text-rose-400 pointer-events-none">
                        <Heart className="h-3 w-3 fill-rose-400" />
                    </div>
                )}
                {friends.length > 0 && (
                    <div className="absolute bottom-2 right-2 z-10">
                        <FriendAvatars friends={friends} size="xs" />
                    </div>
                )}
                {(() => {
                    const localLastRead = manga.lastReadChapterName ?? getLocalLastReadName(manga.id);
                    const total = manga.lastAvailableChapterName ?? manga.lastChapterNumber?.toString() ?? "?";
                    return (
                        <Badge
                            variant="secondary"
                            className="absolute top-2 right-2 z-10 text-[10px] px-2 py-0 h-5 font-medium pointer-events-none"
                        >
                            {localLastRead !== null && (
                                <>
                                    <Eye className="h-2.5 w-2.5" />
                                    {localLastRead}
                                    <span className="opacity-40">/</span>
                                </>
                            )}
                            <BookOpen className="h-2.5 w-2.5" />
                            {total}
                        </Badge>
                    );
                })()}
                <CoverImage
                    src={manga.cover}
                    alt={manga.name}
                    fallbackSrc={manga.fallbackCover}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 pointer-events-none">
                    <span className="text-white text-[10px] font-bold uppercase tracking-wider">
                        Ver detalles
                    </span>
                </div>
            </div>
            <div className="mt-3 space-y-2">
                <h3
                    className="text-sm font-bold truncate leading-none group-hover:text-primary transition-colors"
                    title={manga.name}
                >
                    {manga.name}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                    <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-5 font-medium"
                    >
                        {manga.type ?? "No tipo"}
                    </Badge>
                    <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5 border-primary/50 text-primary font-medium"
                    >
                        {(() => {
                            if (
                                manga.status ===
                                "Pausado por el autor (Hiatus)"
                            )
                                return "Pausado";
                            if (
                                manga.status ===
                                "Abandonado por el scan"
                            )
                                return "Abandonado";
                            return manga.status || "Abandonado";
                        })()}
                    </Badge>
                </div>
            </div>
        </div>
    );
});

export default function MangaList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [genresList, setGenresList] = useState<
        { id: number; name: string }[]
    >([]);

    const page = Number(searchParams.get("page") ?? "1");
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "";
    const type = searchParams.get("type") ?? "";
    const sort = searchParams.get("sort") ?? "updated";
    const order = searchParams.get("order") ?? "desc";
    const genres = searchParams.get("genres") ?? "";
    const selectedGenres = genres.split(",").filter(Boolean);
    const provider = "";
    const backUrl = useMemo(
        () => `/mangas?${searchParams.toString()}`,
        [searchParams],
    );

    useEffect(() => {
        fetchGenres().then(setGenresList);
    }, []);

    function setPage(newPage: number) {
        setSearchParams((prev) => {
            prev.set("page", String(newPage));
            return prev;
        });
    }

    function setSearch(value: string) {
        setSearchParams((prev) => {
            if (value) prev.set("search", value);
            else prev.delete("search");
            prev.set("page", "1");
            return prev;
        });
    }

    function setStatus(value: string) {
        setSearchParams((prev) => {
            if (value) prev.set("status", value);
            else prev.delete("status");
            prev.set("page", "1");
            return prev;
        });
    }

    function setType(value: string) {
        setSearchParams((prev) => {
            if (value) prev.set("type", value);
            else prev.delete("type");
            prev.set("page", "1");
            return prev;
        });
    }

    function setSort(value: string) {
        setSearchParams((prev) => {
            prev.set("sort", value);
            prev.set("page", "1");
            return prev;
        });
    }

    function toggleGenre(name: string) {
        setSearchParams((prev) => {
            const current =
                prev.get("genres")?.split(",").filter(Boolean) ?? [];
            const updated = current.includes(name)
                ? current.filter((g) => g !== name)
                : [...current, name];
            if (updated.length > 0) prev.set("genres", updated.join(","));
            else prev.delete("genres");
            prev.set("page", "1");
            return prev;
        });
    }

    const { data, loading, error } = useMangaList({
        page,
        search,
        status,
        type,
        provider,
        sort,
        order,
        genres,
    });

    const mangas = data?.data ?? [];
    const user = useAuthStore((s) => s.user);
    const { favoriteIds } = useFavoriteIds();
    const [activityMap, setActivityMap] = useState<Record<number, { userId: string; name: string; lastname: string; alias: string | null; avatarUrl: string | null }[]>>({});

    useEffect(() => {
        if (!user || !data?.data?.length) return;
        const ids = data.data.map((m: Manga) => m.id);
        getSeriesActivity(ids).then(setActivityMap).catch(() => setActivityMap({}));
    }, [data, user]);

    const activeFiltersCount = [
        status,
        type,
        genres,
        sort !== "updated" ? sort : "",
    ].filter(Boolean).length;

    return (
        <>
            <SEO
                title="Catálogo de Manga y Manhwa"
                description="Explora cientos de mangas, manhwas y manhuas en Mangalovers. Filtra por género, estado y tipo para encontrar tu próxima lectura."
                canonicalPath="/mangas"
            />
            <JsonLd schema={{
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://mangalovers.josenunez.cl/" },
                    { "@type": "ListItem", "position": 2, "name": "Catálogo", "item": "https://mangalovers.josenunez.cl/mangas" },
                ],
            }} />
            <div className="min-h-screen bg-background">
                <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border shadow-[0_1px_0_0] shadow-brand/5">
                <div className="container mx-auto grid grid-cols-[auto_1fr_auto] items-center h-16 px-4 gap-4">
                    <SidebarTrigger />
                    <div className="flex justify-center min-w-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="flex items-center gap-2.5 shrink-0">
                                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                                    <BookOpen className="h-3.5 w-3.5 text-primary/80" />
                                </div>
                                <span className="text-sm font-semibold tracking-tight">Catálogo</span>
                            </div>
                            <div className="w-full max-w-md">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        placeholder="Buscar por nombre..."
                                        className="pl-9 w-full bg-secondary/50"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <FilterDrawer
                        activeFiltersCount={activeFiltersCount}
                        title="Filtros de búsqueda"
                        onClearAll={() => {
                            setSearchParams((prev) => {
                                prev.delete("status");
                                prev.delete("type");
                                prev.delete("genres");
                                prev.delete("sort");
                                prev.set("page", "1");
                                return prev;
                            });
                        }}
                    >
                        <div className="px-6 py-5 border-b border-border">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                Ordenar por
                            </p>
                            <Select
                                value={sort}
                                onValueChange={setSort}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="updated">
                                        Actualización reciente
                                    </SelectItem>
                                    <SelectItem value="chapters">
                                        Más capítulos
                                    </SelectItem>
                                    <SelectItem value="az">
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
                                {[
                                    { label: "Activo", value: "Activo" },
                                    { label: "Finalizado", value: "Finalizado" },
                                    { label: "Pausado", value: "Pausado por el autor (Hiatus)" },
                                    { label: "Abandonado", value: "Abandonado por el scan" },
                                ].map(({ label, value }) => (
                                    <Badge
                                        key={value}
                                        variant={status === value ? "default" : "outline"}
                                        className="cursor-pointer px-3 py-1 text-xs"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setStatus(status === value ? "" : value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                setStatus(status === value ? "" : value);
                                            }
                                        }}
                                    >
                                        {label}
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
                                        variant={type === value ? "default" : "outline"}
                                        className="cursor-pointer px-3 py-1 text-xs"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setType(type === value ? "" : value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                setType(type === value ? "" : value);
                                            }
                                        }}
                                    >
                                        {label}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="px-6 py-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Géneros
                                </p>
                                {selectedGenres.length > 0 && (
                                    <button
                                        onClick={() => setSearchParams((prev) => { prev.delete("genres"); prev.set("page", "1"); return prev; })}
                                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Limpiar ({selectedGenres.length})
                                    </button>
                                )}
                            </div>
                            <div className="overflow-y-auto max-h-72">
                                {genresList.map((genre, idx) => (
                                    <div
                                        key={genre.id}
                                        role="button"
                                        tabIndex={0}
                                        className={`flex items-center justify-between py-2.5 cursor-pointer group transition-colors ${
                                            idx !== genresList.length - 1 ? "border-b border-border/40" : ""
                                        }`}
                                        onClick={() => toggleGenre(genre.name)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                toggleGenre(genre.name);
                                            }
                                        }}
                                    >
                                        <span className={`text-sm transition-colors ${
                                            selectedGenres.includes(genre.name)
                                                ? "text-foreground font-medium"
                                                : "text-muted-foreground group-hover:text-foreground"
                                        }`}>
                                            {genre.name}
                                        </span>
                                        {selectedGenres.includes(genre.name) && (
                                            <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </FilterDrawer>
                </div>
            </header>

            <main className="container mx-auto py-6 px-4">
                <div className="mb-8">
                    <MangaPagination
                        page={page}
                        totalPages={data?.meta.totalPages ?? 1}
                        setPage={setPage}
                    />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {loading &&
                        Array.from({ length: 24 }).map((_, i) => (
                            <div
                                key={i}
                                className="group cursor-pointer animate-pulse"
                            >
                                <div className="relative aspect-[3/4] rounded-lg overflow-hidden border bg-muted shadow-sm" />
                                <div className="mt-3 h-4 bg-muted rounded w-3/4" />
                            </div>
                        ))}
                    {error && (
                        <div className="col-span-full text-center text-destructive">
                            Error cargando mangas
                        </div>
                    )}
                    {!loading && !error && mangas.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 gap-3 text-center">
                            <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                            <p className="text-muted-foreground text-sm">
                                No se encontraron mangas con estos filtros
                            </p>
                        </div>
                    )}
                    {mangas.map((manga) => (
                        <MangaListItem
                            key={manga.id}
                            manga={manga}
                            isFavorited={favoriteIds.has(manga.id)}
                            backUrl={backUrl}
                            friends={activityMap[manga.id] ?? []}
                        />
                    ))}
                </div>
                <div className="mt-8">
                    <MangaPagination
                        page={page}
                        totalPages={data?.meta.totalPages ?? 1}
                        setPage={setPage}
                    />
                </div>
            </main>
        </div>
        </>
    );
}



