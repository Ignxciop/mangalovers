import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useChapterPages } from "@/hooks/useChapterPages";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useSeriesDetail } from "@/hooks/useSeriesDetail";
import { Progress } from "@/components/ui/progress";
import { useEffect, useRef, useState } from "react";

function useHideOnScrollDown() {
    const [visible, setVisible] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        function onScroll() {
            const current = window.scrollY;
            if (current < 10) {
                setVisible(true);
            } else if (current > lastScrollY.current) {
                setVisible(false);
            } else {
                setVisible(true);
            }
            lastScrollY.current = current;
        }

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return visible;
}

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
            <Button
                disabled={!prev}
                onClick={() =>
                    prev &&
                    navigate(`/manga/${slug}/capitulo/${prev.id}`, {
                        state: { from },
                    })
                }
                className="min-w-0"
            >
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span className="truncate">
                    {prev ? prev.name : "Sin anterior"}
                </span>
            </Button>

            <Button
                disabled={!next}
                onClick={() =>
                    next &&
                    navigate(`/manga/${slug}/capitulo/${next.id}`, {
                        state: { from },
                    })
                }
                className="min-w-0"
            >
                <span className="truncate">
                    {next ? next.name : "Sin siguiente"}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" />
            </Button>
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
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const { series } = useSeriesDetail(slug ?? "");
    const headerVisible = useHideOnScrollDown();

    const currentChapterNumber = chapter ? parseFloat(chapter.name) : 0;
    const totalChapters = series?.chapters.length ?? 0;

    const chaptersLeft =
        totalChapters > 0 && chapter
            ? Math.max(
                  0,
                  totalChapters -
                      series!.chapters.filter(
                          (c) => parseFloat(c.name) <= currentChapterNumber,
                      ).length,
              )
            : null;

    const progressPercent =
        totalChapters > 0
            ? Math.min(
                  Math.round(
                      ((totalChapters - (chaptersLeft ?? 0)) / totalChapters) *
                          100,
                  ),
                  100,
              )
            : null;

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
        <div className="min-h-screen bg-background">
            <div
                className={`
                    sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border
                    transition-transform duration-300
                    md:translate-y-0
                    ${headerVisible ? "translate-y-0" : "-translate-y-full"}
                `}
            >
                <div className="justify-center container mx-auto px-4 h-14 flex items-center gap-4 max-w-3xl">
                    <SidebarTrigger />
                    <button
                        onClick={() =>
                            navigate(`/manga/${slug}`, { state: { from } })
                        }
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group shrink-0"
                    >
                        <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                        <span className="truncate max-w-[250px] sm:max-w-[200px]">
                            {chapter.series.name}
                        </span>
                    </button>
                    <span className="text-muted-foreground/50 shrink-0">/</span>
                    <span className="text-sm text-foreground shrink-0">
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

            {isAuthenticated &&
                progressPercent !== null &&
                chaptersLeft !== null && (
                    <div className="w-full max-w-2xl mx-auto px-4 py-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">
                                Progreso{" "}
                                <span className="font-semibold text-foreground">
                                    {progressPercent}%
                                </span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {chaptersLeft === 0
                                    ? "¡Serie completada!"
                                    : `Faltan ${chaptersLeft} ${chaptersLeft === 1 ? "capítulo" : "capítulos"}`}
                            </span>
                        </div>
                        <Progress value={progressPercent} className="h-1.5" />
                    </div>
                )}

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
