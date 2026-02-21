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

export default function MangaList() {
    // Simulación de 24 mangas
    const mangas = Array.from({ length: 24 });

    return (
        <div className="min-h-screen bg-background">
            {/* HEADER FIJO O STICKY */}
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
                                {/* Aquí irían tus Checkboxes o Selects de géneros */}
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

            {/* CONTENIDO PRINCIPAL */}
            <main className="container mx-auto py-6 px-4">
                {/* Paginación Superior */}
                <div className="mb-8">
                    <MangaPagination />
                </div>

                {/* Grid de 24 Mangas */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {mangas.map((_, i) => (
                        <div key={i} className="group cursor-pointer">
                            {/* Contenedor de Imagen */}
                            <div className="relative aspect-[3/4] rounded-lg overflow-hidden border bg-muted shadow-sm transition-transform group-hover:scale-[1.03]">
                                <img
                                    src={`/api/placeholder/300/400`}
                                    alt="Portada de Manga"
                                    className="object-cover w-full h-full"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                    <span className="text-white text-[10px] font-bold uppercase tracking-wider">
                                        Ver detalles
                                    </span>
                                </div>
                            </div>

                            {/* Información del Manga */}
                            <div className="mt-3 space-y-2">
                                <h3 className="text-sm font-bold truncate leading-none group-hover:text-primary transition-colors">
                                    Manga Title {i + 1}
                                </h3>

                                {/* Los 2 Badges solicitados */}
                                <div className="flex flex-wrap gap-1.5">
                                    <Badge
                                        variant="secondary"
                                        className="text-[10px] px-1.5 py-0 h-5 font-medium"
                                    >
                                        Seinen
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] px-1.5 py-0 h-5 border-primary/50 text-primary font-medium"
                                    >
                                        En Emisión
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Paginación Inferior */}
                <div className="mt-12 mb-8 pt-8">
                    <MangaPagination />
                </div>
            </main>
        </div>
    );
}

// Sub-componente de Paginación para evitar repetición
function MangaPagination() {
    return (
        <Pagination>
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious href="#" />
                </PaginationItem>
                <PaginationItem>
                    <PaginationLink href="#" isActive>
                        1
                    </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                    <PaginationLink href="#">2</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                    <PaginationLink href="#">3</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                    <PaginationNext href="#" />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
}
