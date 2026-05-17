import { useEffect, useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    PlayCircle,
    BookMarked,
    ChevronRight,
    BookOpen,
    Eye,
} from "lucide-react";

export interface ContinueReadingItem {
    id: number;
    name: string;
    slug: string;
    cover: string | null;
    lastReadChapterName: string | null;
    lastAvailableChapterName: string | null;
    chaptersLeft: number | null;
}

function useSmBreakpoint(): boolean {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 640);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return isMobile;
}

const ContinueItem = memo(function ContinueItem({
    item,
}: {
    item: ContinueReadingItem;
}) {
    const navigate = useNavigate();
    const progress =
        item.lastReadChapterName && item.lastAvailableChapterName
            ? Math.min(
                  (parseFloat(item.lastReadChapterName) /
                      parseFloat(item.lastAvailableChapterName)) * 100,
                  100,
              )
            : 0;

    return (
        <div className="group animate-fade-in-up">
            <a
                href={`/manga/${item.slug}`}
                onClick={(e) => {
                    e.preventDefault();
                    navigate(`/manga/${item.slug}`);
                }}
                className="relative block aspect-[2/3] rounded-xl overflow-hidden border border-white/10 dark:border-white/[0.05] shadow-md transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-[0_0_25px_-5px] group-hover:shadow-brand/30 group-hover:border-brand/20 active:scale-[0.98]"
            >
                {item.cover ? (
                    <img
                        src={item.cover}
                        alt={item.name}
                        width={300}
                        height={450}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-t from-brand/20 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
                {item.lastReadChapterName && (
                    <div className="absolute top-2 right-2">
                        <Badge
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 h-4 gap-1"
                        >
                            <Eye className="h-2 w-2" />
                            {item.lastReadChapterName}
                        </Badge>
                    </div>
                )}
            </a>
            <div className="mt-2 space-y-0.5">
                <h3
                    className="text-[11px] font-semibold truncate leading-tight"
                    title={item.name}
                >
                    {item.name}
                </h3>
                {item.chaptersLeft !== null && item.chaptersLeft > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                        {item.chaptersLeft} cap. pendientes
                    </p>
                )}
                {item.chaptersLeft === 0 && (
                    <p className="text-[10px] text-emerald-500 font-medium">
                        Al día
                    </p>
                )}
            </div>
        </div>
    );
});

export function ContinueReadingSection({
    items,
}: {
    items: ContinueReadingItem[];
}) {
    const navigate = useNavigate();
    const isMobile = useSmBreakpoint();

    const limit = isMobile ? 6 : 5;
    const visibleItems = items.slice(0, limit);

    if (items.length === 0) {
        return (
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <PlayCircle className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold tracking-wide">
                        Continuar leyendo
                    </h2>
                </div>
                <div className="flex flex-col items-center justify-center py-10 gap-3 rounded-xl border border-dashed border-border text-center">
                    <BookMarked className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                        Aún no has empezado a leer ninguna serie
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/mangas")}
                    >
                        Explorar catálogo
                    </Button>
                </div>
            </section>
        );
    }

    return (
        <section className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <PlayCircle className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold tracking-wide">
                        Continuar leyendo
                    </h2>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground h-7 px-2 hover:text-foreground"
                    onClick={() => navigate("/favoritos")}
                >
                    Ver todos
                    <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {visibleItems.map((item) => (
                    <ContinueItem key={item.id} item={item} />
                ))}
            </div>
        </section>
    );
}

export function ContinueSkeleton() {
    const isMobile = useSmBreakpoint();

    return (
        <section>
            <Skeleton className="h-4 w-40 mb-4" />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {Array.from({ length: isMobile ? 6 : 5 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="aspect-[2/3] rounded-xl" />
                        <Skeleton className="h-3 w-3/4" />
                    </div>
                ))}
            </div>
        </section>
    );
}
