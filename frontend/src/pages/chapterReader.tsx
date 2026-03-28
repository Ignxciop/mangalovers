import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useChapterPages } from "@/hooks/useChapterPages";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ChevronLeft,
    ChevronRight,
    Rows,
    BookOpen,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useSeriesDetail } from "@/hooks/useSeriesDetail";
import { useReadChapters } from "@/hooks/useReadChapters";
import { Progress } from "@/components/ui/progress";
import { useEffect, useRef, useState, useMemo } from "react";

const STORAGE_KEY = "reader_prefs";
type ReadMode = "cascade" | "pagination";
interface ReaderPrefs {
    mode: ReadMode;
    zoom: number;
}

const ZOOM_STEPS = [600, 680, 768, 880, 960];
const ZOOM_LABELS: Record<number, string> = {
    600: "75%",
    680: "90%",
    768: "100%",
    880: "115%",
    960: "125%",
};
const DEFAULT_PREFS: ReaderPrefs = { mode: "cascade", zoom: 768 };

function loadPrefs(): ReaderPrefs {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_PREFS;
        const parsed = JSON.parse(raw);
        return {
            mode: parsed.mode === "pagination" ? "pagination" : "cascade",
            zoom: ZOOM_STEPS.includes(parsed.zoom) ? parsed.zoom : 768,
        };
    } catch {
        return DEFAULT_PREFS;
    }
}

function savePrefs(prefs: ReaderPrefs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

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

function ReaderControls({
    prefs,
    onModeChange,
    onZoomChange,
}: {
    prefs: ReaderPrefs;
    onModeChange: (mode: ReadMode) => void;
    onZoomChange: (zoom: number) => void;
}) {
    const zoomIndex = ZOOM_STEPS.indexOf(prefs.zoom);

    return (
        <div className="flex items-center justify-center gap-6 w-full max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center gap-1 border border-border rounded-lg p-1">
                <button
                    onClick={() => onModeChange("cascade")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        prefs.mode === "cascade"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Rows className="h-3.5 w-3.5" />
                    Cascada
                </button>
                <button
                    onClick={() => onModeChange("pagination")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        prefs.mode === "pagination"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <BookOpen className="h-3.5 w-3.5" />
                    Página
                </button>
            </div>

            <div className="hidden md:flex items-center gap-2 border border-border rounded-lg px-3 py-1.5">
                <button
                    onClick={() =>
                        onZoomChange(ZOOM_STEPS[Math.max(0, zoomIndex - 1)])
                    }
                    disabled={zoomIndex === 0}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                >
                    <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs font-medium w-9 text-center tabular-nums">
                    {ZOOM_LABELS[prefs.zoom]}
                </span>
                <button
                    onClick={() =>
                        onZoomChange(
                            ZOOM_STEPS[
                                Math.min(ZOOM_STEPS.length - 1, zoomIndex + 1)
                            ],
                        )
                    }
                    disabled={zoomIndex === ZOOM_STEPS.length - 1}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                >
                    <ZoomIn className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
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

function PaginationReader({
    pages,
    zoom,
}: {
    pages: { id: number; url: string }[];
    zoom: number;
}) {
    const [currentPage, setCurrentPage] = useState(0);
    const page = pages[currentPage];

    return (
        <div className="flex flex-col items-center gap-4">
            <div
                style={{
                    maxWidth: `${zoom}px`,
                    width: "100%",
                    margin: "0 auto",
                }}
            >
                <img
                    key={page.id}
                    src={page.url}
                    alt={`Página ${currentPage + 1}`}
                    className="w-full select-none block"
                />
            </div>
            <div className="flex items-center gap-3 py-2">
                <button
                    onClick={() => {
                        setCurrentPage((p) => Math.max(0, p - 1));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={currentPage === 0}
                    className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-30"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-muted-foreground tabular-nums">
                    {currentPage + 1} / {pages.length}
                </span>
                <button
                    onClick={() => {
                        setCurrentPage((p) =>
                            Math.min(pages.length - 1, p + 1),
                        );
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={currentPage === pages.length - 1}
                    className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-30"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
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
    const chapters = useMemo(() => series?.chapters ?? [], [series]);
    const { markUntil } = useReadChapters(series?.id ?? 0, chapters);
    const headerVisible = useHideOnScrollDown();

    const [prefs, setPrefs] = useState<ReaderPrefs>(loadPrefs);

    const markUntilRef = useRef(markUntil);
    useEffect(() => {
        markUntilRef.current = markUntil;
    });

    const chapterId_dep = chapter?.chapterId;
    const seriesReady = !!series;

    useEffect(() => {
        if (isAuthenticated || !chapter || !series) return;
        markUntilRef.current(chapter.chapterId);
    }, [chapterId_dep, isAuthenticated, seriesReady, chapter, series]);

    function updateMode(mode: ReadMode) {
        const updated = { ...prefs, mode };
        setPrefs(updated);
        savePrefs(updated);
    }

    function updateZoom(zoom: number) {
        const updated = { ...prefs, zoom };
        setPrefs(updated);
        savePrefs(updated);
    }

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

            <ReaderControls
                prefs={prefs}
                onModeChange={updateMode}
                onZoomChange={updateZoom}
            />

            <ChapterNav
                slug={slug!}
                prev={chapter.prev}
                next={chapter.next}
                from={from}
            />

            {prefs.mode === "cascade" ? (
                <div
                    className="flex flex-col items-center gap-1 mx-auto"
                    style={{ maxWidth: `${prefs.zoom}px`, width: "100%" }}
                >
                    {chapter.pages.map((page, index) => (
                        <img
                            key={page.id}
                            src={page.url}
                            alt={`Página ${index + 1}`}
                            className="w-full select-none block"
                            loading="lazy"
                        />
                    ))}
                </div>
            ) : (
                <PaginationReader
                    key={chapter.pages[0]?.id ?? chapterId}
                    pages={chapter.pages}
                    zoom={prefs.zoom}
                />
            )}

            {progressPercent !== null && chaptersLeft !== null && (
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
