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

import { SidebarTrigger } from "@/components/ui/sidebar";
import { useMangaList } from "@/hooks/useMangaList";

    const [page, setPage] = useState(1);
    const { data, loading, error } = useMangaList({ page });

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
                                        <Badge
                                            variant="outline"
                                            className="cursor-pointer"
                                        >
                                            Emisión
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className="cursor-pointer"
                                        >
                                            Finalizado
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className="cursor-pointer"
                                        >
                                            Hiato
                                        </Badge>
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
                        totalPages={data?.meta?.totalPages || 1}
                        onPageChange={setPage}
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
                        data.data.map((manga) => (
                            <div
                                key={manga.id}
                                className="group cursor-pointer"
                            >
                                <div className="relative aspect-[3/4] rounded-lg overflow-hidden border bg-muted shadow-sm transition-transform group-hover:scale-[1.03]">
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
                                    <h3 className="text-sm font-bold truncate leading-none group-hover:text-primary transition-colors">
                                        {manga.name}
                                    </h3>
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
                                            {manga.status || "En Emisión"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
                <div className="mt-12 mb-8 pt-8">
                    <MangaPagination
                        page={page}
                        totalPages={data?.meta?.totalPages || 1}
                        onPageChange={setPage}
                    />
                </div>
            </main>
        </div>
    );
}

interface MangaPaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

function MangaPagination({ page, totalPages, onPageChange }: MangaPaginationProps) {
    // Mostrar máximo 5 páginas en la paginación
    const getPages = () => {
        const pages = [];
        let start = Math.max(1, page - 2);
        let end = Math.min(totalPages, page + 2);
        if (end - start < 4) {
            if (start === 1) end = Math.min(totalPages, start + 4);
            if (end === totalPages) start = Math.max(1, end - 4);
        }
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
    };

    return (
        <Pagination>
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        href="#"
                        onClick={e => {
                            e.preventDefault();
                            if (page > 1) onPageChange(page - 1);
                        }}
                        aria-disabled={page === 1}
                    />
                </PaginationItem>
                {getPages().map(p => (
                    <PaginationItem key={p}>
                        <PaginationLink
                            href="#"
                            isActive={p === page}
                            onClick={e => {
                                e.preventDefault();
                                onPageChange(p);
                            }}
                        >
                            {p}
                        </PaginationLink>
                    </PaginationItem>
                ))}
                <PaginationItem>
                    <PaginationNext
                        href="#"
                        onClick={e => {
                            e.preventDefault();
                            if (page < totalPages) onPageChange(page + 1);
                        }}
                        aria-disabled={page === totalPages}
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
}
