import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchFavorites, deleteFavorite, upsertFavorite } from "@/api/manga";
import type { Favorite } from "@/types/manga";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Heart, Check, Clock } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return "Justo ahora";
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `Hace ${Math.floor(diff / 86400)}d`;
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export default function FavoritesList() {
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"Todos" | "Siguiendo" | "Terminado">(
        "Todos",
    );

    useEffect(() => {
        fetchFavorites()
            .then(setFavorites)
            .finally(() => setLoading(false));
    }, []);

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

    const filtered =
        filter === "Todos"
            ? favorites
            : favorites.filter((f) => f.status === filter);

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-white/5">
                <div className="container mx-auto flex h-16 items-center px-4 gap-4 max-w-5xl">
                    <SidebarTrigger />
                    <h1 className="text-lg font-bold flex-1">Mis favoritos</h1>
                    <div className="flex items-center gap-2">
                        {(["Todos", "Siguiendo", "Terminado"] as const).map(
                            (f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                        filter === f
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "border-white/10 text-white/60 hover:text-white"
                                    }`}
                                >
                                    {f}
                                </button>
                            ),
                        )}
                    </div>
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
                            {filter === "Todos"
                                ? "Aún no tienes favoritos guardados"
                                : `No tienes mangas en estado "${filter}"`}
                        </p>
                        <button
                            onClick={() => navigate("/mangas")}
                            className="text-sm text-primary underline underline-offset-4"
                        >
                            Explorar catálogo
                        </button>
                    </div>
                )}

                {!loading && filtered.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {filtered.map((fav) => (
                            <div key={fav.id} className="group">
                                <div
                                    className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/10 shadow-lg cursor-pointer transition-transform group-hover:scale-[1.02]"
                                    onClick={() =>
                                        navigate(`/manga/${fav.series.slug}`)
                                    }
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
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemove(fav.seriesId);
                                        }}
                                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                                        title="Quitar de favoritos"
                                    >
                                        <Heart className="h-3.5 w-3.5 fill-rose-400" />
                                    </button>
                                </div>

                                <div className="mt-2 space-y-1.5">
                                    <h3
                                        className="text-sm font-semibold truncate cursor-pointer hover:text-primary transition-colors"
                                        title={fav.series.name}
                                        onClick={() =>
                                            navigate(
                                                `/manga/${fav.series.slug}`,
                                            )
                                        }
                                    >
                                        {fav.series.name}
                                    </h3>
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                        <span>
                                            {fav.readCount} /{" "}
                                            {fav.series.chapterCount} caps
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
                                    {fav.series.chapterCount > 0 && (
                                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all"
                                                style={{
                                                    width: `${Math.min((fav.readCount / fav.series.chapterCount) * 100, 100)}%`,
                                                }}
                                            />
                                        </div>
                                    )}
                                    {fav.lastReadChapterName && (
                                        <p className="text-[10px] text-muted-foreground truncate">
                                            Último leído: cap.{" "}
                                            {fav.lastReadChapterName}
                                        </p>
                                    )}
                                    {fav.status && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full text-[10px] bg-white/5 border-white/10 text-white/70 h-7 px-2 py-1 justify-between"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    {fav.status}
                                                </Button>
                                            </DropdownMenuTrigger>

                                            <DropdownMenuContent
                                                align="end"
                                                className="w-[140px]"
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStatusChange(
                                                            fav.seriesId,
                                                            "Siguiendo",
                                                        );
                                                    }}
                                                    className="flex justify-between cursor-pointer"
                                                >
                                                    Siguiendo
                                                    {fav.status ===
                                                        "Siguiendo" && (
                                                        <Check className="h-3 w-3" />
                                                    )}
                                                </DropdownMenuItem>

                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStatusChange(
                                                            fav.seriesId,
                                                            "Terminado",
                                                        );
                                                    }}
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
