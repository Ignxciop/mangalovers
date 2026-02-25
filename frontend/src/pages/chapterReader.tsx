import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useChapterPages } from "@/hooks/useChapterPages";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useEffect } from "react";
import { markChapterUntil } from "@/api/manga";

function ChapterNav({
    slug,
    prev,
    next,
    from,
}: {
    slug: string;
    prev: { id: number; name: string } | null;
    next: { id: number; name: string } | null;
    from: string;
}) {
    const navigate = useNavigate();

    return (
        <div className="flex items-center justify-between gap-4 w-full max-w-2xl mx-auto px-4 py-4">
            <button
                disabled={!prev}
                onClick={() =>
                    prev &&
                    navigate(`/manga/${slug}/capitulo/${prev.id}`, {
                        state: { from },
                    })
                }
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed min-w-0"
            >
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span className="truncate">
                    {prev ? prev.name : "Sin anterior"}
                </span>
            </button>

            <button
                disabled={!next}
                onClick={() =>
                    next &&
                    navigate(`/manga/${slug}/capitulo/${next.id}`, {
                        state: { from },
                    })
                }
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed min-w-0"
            >
                <span className="truncate">
                    {next ? next.name : "Sin siguiente"}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" />
            </button>
        </div>
    );
}

export default function ChapterReader() {
    const { slug, chapterId } = useParams<{
        slug: string;
        chapterId: string;
    }>();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from ?? "/mangas";

    const { chapter, loading, error } = useChapterPages(
        chapterId ? Number(chapterId) : null,
    );

    useEffect(() => {
        if (!chapter) return;
        markChapterUntil(chapter.chapterId);
    }, [chapter]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center py-10 gap-4 px-4">
                <Skeleton className="h-5 w-40 mb-6" />
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton
                        key={i}
                        className="w-full max-w-2xl h-96 rounded-lg"
                    />
                ))}
            </div>
        );
    }

    if (error || !chapter) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center px-4">
                <h2 className="text-xl font-bold">Capítulo no encontrado</h2>
                <button
                    onClick={() =>
                        navigate(`/manga/${slug}`, { state: { from } })
                    }
                    className="text-sm text-primary underline underline-offset-4"
                >
                    Volver a la serie
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black">
            <div className="sticky top-0 z-40 bg-black/80 backdrop-blur border-b border-white/10">
                <div className="justify-center container mx-auto px-4 h-14 flex items-center gap-4 max-w-3xl">
                    <SidebarTrigger />
                    <button
                        onClick={() =>
                            navigate(`/manga/${slug}`, { state: { from } })
                        }
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                    >
                        <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                        {chapter.series.name}
                    </button>
                    <span className="text-white/30">/</span>
                    <span className="text-sm text-white/80 truncate">
                        {chapter.name}
                    </span>
                </div>
            </div>

            <ChapterNav
                slug={slug!}
                prev={chapter.prev}
                next={chapter.next}
                from={from}
            />

            <div className="flex flex-col items-center gap-1">
                {chapter.pages.map((page, index) => (
                    <img
                        key={page.id}
                        src={page.url}
                        alt={`Página ${index + 1}`}
                        className="w-full max-w-2xl select-none"
                        loading="lazy"
                    />
                ))}
            </div>

            <ChapterNav
                slug={slug!}
                prev={chapter.prev}
                next={chapter.next}
                from={from}
            />

            <div className="text-center py-6 text-muted-foreground text-sm">
                Fin del capítulo —{" "}
                <button
                    onClick={() =>
                        navigate(`/manga/${slug}`, { state: { from } })
                    }
                    className="text-primary underline underline-offset-4"
                >
                    volver a la serie
                </button>
            </div>
        </div>
    );
}
