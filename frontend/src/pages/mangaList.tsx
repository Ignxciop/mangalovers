import { Search, SlidersHorizontal } from "lucide-react";
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
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

import React, { useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useMangaList } from "@/hooks/useMangaList";

export default function MangaList() {
    const [page, setPage] = useState<number>(1);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [provider, setProvider] = useState("");
    const [sort, setSort] = useState("updated");
    const [order, setOrder] = useState("desc");

    const { data, loading, error } = useMangaList({
        page,
        search,
        status,
        provider,
        sort,
        order,
    });

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur">
                <div className="container mx-auto flex h-16 items-center px-4 gap-4">
                    <SidebarTrigger />
                    <div className="flex flex-1 items-center max-w-md relative">
                        <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre..."
                            className="pl-9 w-full bg-secondary/50"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>

                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="shrink-0">
                                <SlidersHorizontal className="mr-2 h-4 w-4" />
                                Filtros
                            </Button>
                        </SheetTrigger>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>Filtros de Búsqueda</SheetTitle>
                            </SheetHeader>
                            <div className="py-6 space-y-6">
                                <div className="space-y-4">
                                    <h3 className="font-medium text-sm">
                                        Estado
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            {
                                                label: "Emisión",
                                                value: "Activo",
                                            },
                                            {
                                                label: "Finalizado",
                                                value: "Finalizado",
                                            },
                                            {
                                                label: "Hiatus",
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
                                                        ? "secondary"
                                                        : "outline"
                                                }
                                                className="cursor-pointer"
                                                onClick={() => {
                                                    setStatus(
                                                        status === value
                                                            ? ""
                                                            : value,
                                                    );
                                                    setPage(1);
                                                }}
                                            >
                                                {label}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </header>
            <main className="container mx-auto py-6 px-4">
                <div className="mb-8">
                    <MangaPagination
                        page={page}
                        totalPages={
                            data && typeof data.meta === "object"
                                ? data.meta.totalPages
                                : 1
                        }
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
                    {data &&
                        Array.isArray(data.data) &&
                        data.data.map((manga: any) => (
                            <div
                                key={manga.id}
                                className="group cursor-pointer"
                            >
                                <div className="relative aspect-[3/4] rounded-lg overflow-hidden border bg-muted shadow-sm transition-transform group-hover:scale-[1.03]">
                                    {/* Badge de capítulos */}
                                    <Badge
                                        variant="secondary"
                                        className="absolute top-2 right-2 z-10 text-[10px] px-2 py-0 h-5 font-medium"
                                    >
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
                                    {/* Tooltip para nombre completo */}
                                    <div className="relative">
                                        <h3
                                            className="text-sm font-bold truncate leading-none group-hover:text-primary transition-colors"
                                            title={manga.name}
                                        >
                                            {manga.name}
                                        </h3>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        <Badge
                                            variant="secondary"
                                            className="text-[10px] px-1.5 py-0 h-5 font-medium"
                                        >
                                            {manga.providers?.[0] || "Seinen"}
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
                                                return (
                                                    manga.status || "Abandonado"
                                                );
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
                        totalPages={
                            data && typeof data.meta === "object"
                                ? data.meta.totalPages
                                : 1
                        }
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
    // Calcular rango de páginas a mostrar
    const pageNumbers: number[] = [];
    // Siempre mostrar la primera página
    pageNumbers.push(1);

    // Rango centrado en la actual
    let start = Math.max(page - 3, 2);
    let end = Math.min(page + 3, totalPages - 1);

    // Ajustar si estamos cerca del inicio o final
    if (page <= 4) {
        start = 2;
        end = Math.min(7, totalPages - 1);
    }
    if (page >= totalPages - 3) {
        start = Math.max(totalPages - 6, 2);
        end = totalPages - 1;
    }

    for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
    }

    // Siempre mostrar la última página si hay más de una
    if (totalPages > 1) {
        pageNumbers.push(totalPages);
    }

    // Eliminar duplicados
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
                        {/* Mostrar puntos suspensivos si hay salto */}
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
