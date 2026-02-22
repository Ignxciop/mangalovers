import { useParams, useNavigate } from "react-router-dom";
import { useChapterPages } from "@/hooks/useChapterPages";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";

export default function ChapterReader() {
    const { slug, chapterId } = useParams<{
        slug: string;
        chapterId: string;
    }>();
    const navigate = useNavigate();
    const { chapter, loading, error } = useChapterPages(
        chapterId ? Number(chapterId) : null,
    );

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
                    onClick={() => navigate(`/manga/${slug}`)}
                    className="text-sm text-primary underline underline-offset-4"
                >
                    Volver a la serie
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-black/80 backdrop-blur border-b border-white/10">
                <div className="container mx-auto px-4 h-14 flex items-center gap-4 max-w-3xl">
                    <button
                        onClick={() => navigate(`/manga/${slug}`)}
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

            {/* Pages */}
            <div className="flex flex-col items-center gap-1 py-4">
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

            {/* Footer */}
            <div className="text-center py-10 text-muted-foreground text-sm">
                Fin del capítulo —{" "}
                <button
                    onClick={() => navigate(`/manga/${slug}`)}
                    className="text-primary underline underline-offset-4"
                >
                    volver a la serie
                </button>
            </div>
        </div>
    );
}
