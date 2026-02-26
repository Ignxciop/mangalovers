import { Search, SlidersHorizontal, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

import React, { useEffect, useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useMangaList } from "@/hooks/useMangaList";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchGenres } from "@/api/manga";

export default function MangaList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [genresList, setGenresList] = useState<
        { id: number; name: string }[]
    >([]);

    const page = Number(searchParams.get("page") ?? "1");
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "";
    const sort = searchParams.get("sort") ?? "updated";
    const order = searchParams.get("order") ?? "desc";
    const genres = searchParams.get("genres") ?? "";
    const selectedGenres = genres.split(",").filter(Boolean);
    const provider = "";

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
        provider,
        sort,
        order,
        genres,
    });

    const navigate = useNavigate();
    const mangas = data?.data ?? [];

    const activeFiltersCount = [
        status,
        genres,
        sort !== "updated" ? sort : "",
    ].filter(Boolean).length;

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border">
                <div className="container mx-auto flex h-16 items-center px-4 gap-4 justify-between">
                    <SidebarTrigger />
                    <div className="flex flex-1 items-center max-w-md relative">
                        <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre..."
                            className="pl-9 w-full bg-secondary/50"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="outline"
                                className="shrink-0 relative"
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
                                    Filtros de búsqueda
                                </SheetTitle>
                            </SheetHeader>

                            <div className="flex-1 overflow-y-auto">
                                {/* Ordenar por */}
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
                                                Más reciente
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

                                {/* Estado */}
                                <div className="px-6 py-5 border-b border-border">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                        Estado
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            {
                                                label: "Activo",
                                                value: "Activo",
                                            },
                                            {
                                                label: "Finalizado",
                                                value: "Finalizado",
                                            },
                                            {
                                                label: "Pausado",
                                                value: "Pausado por el autor (Hiatus)",
                                            },
                                            {
                                                label: "Abandonado",
                                                value: "Abandonado por el scan",
                                            },
                                        ].map(({ label, value }) => (
                                            <Badge
                                                key={value}
                                                variant={
                                                    status === value
                                                        ? "default"
                                                        : "outline"
                                                }
                                                className="cursor-pointer px-3 py-1 text-xs"
                                                onClick={() =>
                                                    setStatus(
                                                        status === value
                                                            ? ""
                                                            : value,
                                                    )
                                                }
                                            >
                                                {label}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Géneros */}
                                <div className="px-6 py-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Géneros
                                        </p>
                                        {selectedGenres.length > 0 && (
                                            <button
                                                onClick={() =>
                                                    setSearchParams((prev) => {
                                                        prev.delete("genres");
                                                        prev.set("page", "1");
                                                        return prev;
                                                    })
                                                }
                                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                Limpiar ({selectedGenres.length}
                                                )
                                            </button>
                                        )}
                                    </div>
                                    <div className="overflow-y-auto max-h-72">
                                        {genresList.map((genre, idx) => (
                                            <div
                                                key={genre.id}
                                                className={`flex items-center justify-between py-2.5 cursor-pointer group transition-colors ${
                                                    idx !==
                                                    genresList.length - 1
                                                        ? "border-b border-border/40"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    toggleGenre(genre.name)
                                                }
                                            >
                                                <span
                                                    className={`text-sm transition-colors ${
                                                        selectedGenres.includes(
                                                            genre.name,
                                                        )
                                                            ? "text-foreground font-medium"
                                                            : "text-muted-foreground group-hover:text-foreground"
                                                    }`}
                                                >
                                                    {genre.name}
                                                </span>
                                                {selectedGenres.includes(
                                                    genre.name,
                                                ) && (
                                                    <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer con limpiar todo */}
                            {activeFiltersCount > 0 && (
                                <div className="px-6 py-4 border-t border-border">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => {
                                            setSearchParams((prev) => {
                                                prev.delete("status");
                                                prev.delete("genres");
                                                prev.delete("sort");
                                                prev.set("page", "1");
                                                return prev;
                                            });
                                        }}
                                    >
                                        Limpiar todos los filtros
                                    </Button>
                                </div>
                            )}
                        </SheetContent>
                    </Sheet>
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
                    {mangas.map((manga) => (
                        <div
                            key={manga.id}
                            className="group cursor-pointer"
                            onClick={() =>
                                navigate(`/manga/${manga.slug}`, {
                                    state: {
                                        from: `/mangas?${searchParams.toString()}`,
                                    },
                                })
                            }
                        >
                            <div className="relative aspect-[3/4] rounded-lg overflow-hidden border bg-muted shadow-sm transition-transform group-hover:scale-[1.03]">
                                <Badge
                                    variant="secondary"
                                    className="absolute top-2 right-2 z-10 text-[10px] px-2 py-0 h-5 font-medium"
                                >
                                    <BookOpen className="h-2.5 w-2.5" />
                                    {manga.chapterCount}
                                </Badge>
                                <img
                                    src={
                                        manga.cover ||
                                        "/api/placeholder/300/400"
                                    }
                                    alt={manga.name}
                                    className="object-cover w-full h-full"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
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
                                        {manga.providers?.[0] ??
                                            "Sin proveedor"}
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
                    ))}
                </div>
                <div className="mt-12 mb-8 pt-8">
                    <MangaPagination
                        page={page}
                        totalPages={data?.meta.totalPages ?? 1}
                        setPage={setPage}
                    />
                </div>
            </main>
        </div>
    );
}

interface MangaPaginationProps {
    page: number;
    totalPages: number;
    setPage: (page: number) => void;
}

const MangaPagination: React.FC<MangaPaginationProps> = ({
    page,
    totalPages,
    setPage,
}) => {
    const handlePrev = () => {
        if (page > 1) setPage(page - 1);
    };
    const handleNext = () => {
        if (page < totalPages) setPage(page + 1);
    };

    const pageNumbers: number[] = [1];
    let start = Math.max(page - 3, 2);
    let end = Math.min(page + 3, totalPages - 1);

    if (page <= 4) {
        start = 2;
        end = Math.min(7, totalPages - 1);
    }
    if (page >= totalPages - 3) {
        start = Math.max(totalPages - 6, 2);
        end = totalPages - 1;
    }

    for (let i = start; i <= end; i++) pageNumbers.push(i);
    if (totalPages > 1) pageNumbers.push(totalPages);

    const uniquePages = [...new Set(pageNumbers)];

    return (
        <Pagination>
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            handlePrev();
                        }}
                        aria-disabled={page === 1}
                    />
                </PaginationItem>
                {uniquePages.map((p, idx) => (
                    <React.Fragment key={p}>
                        {idx > 0 &&
                            uniquePages[idx] - uniquePages[idx - 1] > 1 && (
                                <PaginationItem key={`ellipsis-${p}`}>
                                    <span className="px-2 text-muted-foreground">
                                        ...
                                    </span>
                                </PaginationItem>
                            )}
                        <PaginationItem>
                            <PaginationLink
                                href="#"
                                isActive={p === page}
                                onClick={(e) => {
                                    e.preventDefault();
                                    setPage(p);
                                }}
                            >
                                {p}
                            </PaginationLink>
                        </PaginationItem>
                    </React.Fragment>
                ))}
                <PaginationItem>
                    <PaginationNext
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            handleNext();
                        }}
                        aria-disabled={page === totalPages}
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
};
