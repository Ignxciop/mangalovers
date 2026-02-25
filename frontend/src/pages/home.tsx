import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchLatestManga } from "@/api/manga";
import type { Manga } from "@/types/manga";
import { Clock, Flame, BookOpen } from "lucide-react";

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

function MangaCard({ manga, index }: { manga: Manga; index: number }) {
    const navigate = useNavigate();
    const [imgLoaded, setImgLoaded] = useState(false);

    return (
        <div
            className="group cursor-pointer"
            style={{ animationDelay: `${index * 40}ms` }}
            onClick={() => navigate(`/manga/${manga.slug}`)}
        >
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/8 shadow-lg transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-2xl group-hover:border-white/20">
                {!imgLoaded && (
                    <div className="absolute inset-0 bg-white/5 animate-pulse" />
                )}
                <img
                    src={manga.cover || ""}
                    alt={manga.name}
                    onLoad={() => setImgLoaded(true)}
                    className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                />

                {/* gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                {/* chapter count badge */}
                <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-sm border border-white/10 rounded-md px-1.5 py-0.5 flex items-center gap-1">
                    <BookOpen className="h-2.5 w-2.5 text-white/60" />
                    <span className="text-[10px] font-mono text-white/80">
                        {manga.chapterCount}
                    </span>
                </div>

                {/* time ago */}
                <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 text-[10px] text-white/50">
                    <Clock className="h-2.5 w-2.5" />
                    {timeAgo(manga.lastChapterPublishedAt!)}
                </div>
            </div>

            <div className="mt-2.5 px-0.5">
                <h3
                    className="text-[12px] font-semibold text-white/85 truncate leading-tight group-hover:text-white transition-colors"
                    title={manga.name}
                >
                    {manga.name}
                </h3>
            </div>
        </div>
    );
}

function MangaCardSkeleton() {
    return (
        <div className="space-y-2.5">
            <Skeleton className="aspect-[2/3] rounded-xl w-full" />
            <Skeleton className="h-3 w-3/4 rounded" />
        </div>
    );
}

export default function Home() {
    const [mangas, setMangas] = useState<Manga[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        fetchLatestManga(24)
            .then(setMangas)
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 w-full bg-background/90 backdrop-blur border-b border-white/5">
                <div className="container mx-auto flex h-16 items-center px-4 gap-3 max-w-7xl">
                    <SidebarTrigger />
                    <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-orange-400" />
                        <span className="text-sm font-semibold text-white/90 tracking-wide">
                            Últimas actualizaciones
                        </span>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-7xl">
                {error && (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                        <p className="text-4xl">📭</p>
                        <p className="text-muted-foreground text-sm">
                            No se pudieron cargar las actualizaciones
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                    {loading
                        ? Array.from({ length: 24 }).map((_, i) => (
                              <MangaCardSkeleton key={i} />
                          ))
                        : mangas.map((manga, i) => (
                              <MangaCard
                                  key={manga.id}
                                  manga={manga}
                                  index={i}
                              />
                          ))}
                </div>

                {!loading && mangas.length === 0 && !error && (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                        <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                        <p className="text-muted-foreground text-sm">
                            No hay actualizaciones recientes
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
