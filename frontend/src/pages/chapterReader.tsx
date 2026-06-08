import { SEO } from "@/components/seo";
import { JsonLd } from "@/components/jsonld";
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
import { ChapterImage } from "@/components/chapterImage";
import { useSeriesDetail } from "@/hooks/useSeriesDetail";
import { useReadChapters } from "@/hooks/useReadChapters";
import { useKeyboardReader } from "@/hooks/useKeyboardReader";
import { useChapterProgress } from "@/hooks/useChapterProgress";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CommentSection } from "@/components/comments/CommentSection";
import {
    useEffect,
    useRef,
    useState,
    useMemo,
    useCallback,
    forwardRef,
    useImperativeHandle,
} from "react";
import { PullToRefresh } from "@/components/pullToRefresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
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
            <div className="flex items-center gap-1 border border-white/10 rounded-lg p-1 bg-white/5">
                <button
                    onClick={() => onModeChange("cascade")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        prefs.mode === "cascade"
                            ? "bg-brand text-white shadow-[0_0_12px_-4px] shadow-brand/50"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Rows className="h-3.5 w-3.5" />
                    Cascada
                </button>
                <button
                    onClick={() => onModeChange("pagination")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        prefs.mode === "pagination"
                            ? "bg-brand text-white shadow-[0_0_12px_-4px] shadow-brand/50"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <BookOpen className="h-3.5 w-3.5" />
                    Página
                </button>
            </div>

            <div className="hidden md:flex items-center gap-2 border border-white/10 rounded-lg px-3 py-1.5 bg-white/5">
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

export function ChapterNav({
    slug,
    prev,
    next,
    from,
    onNext,
}: {
    slug: string;
    prev: { id: number; name: string } | null;
    next: { id: number; name: string } | null;
    from: string;
    onNext?: (chapterId: number) => void;
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
                onClick={() => {
                    if (!next) return;
                    onNext?.(next.id);
                    navigate(`/manga/${slug}/capitulo/${next.id}`, {
                        state: { from },
                    });
                }}
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

export interface PaginationReaderHandle {
    prevPage: () => void;
    nextPage: () => void;
    goToPage: (page: number) => void;
}

    const PaginationReader = forwardRef<
    PaginationReaderHandle,
    {
        pages: { id: number; url: string }[];
        zoom: number;
        onChapterChange: (direction: "prev" | "next") => void;
        hasPrevChapter: boolean;
        hasNextChapter: boolean;
        onPageChange?: (page: number) => void;
        onImageFailed?: () => void;
    }
>(function PaginationReader(
    { pages, zoom, onChapterChange, hasPrevChapter, hasNextChapter, onPageChange, onImageFailed },
    ref,
) {
    const [currentPage, setCurrentPage] = useState(0);
    const [tapFeedback, setTapFeedback] = useState<"left" | "right" | null>(
        null,
    );
    const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const page = pages[currentPage];

    useImperativeHandle(
        ref,
        () => ({
            prevPage() {
                if (currentPage > 0) {
                    setCurrentPage((p) => p - 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                } else if (hasPrevChapter) {
                    onChapterChange("prev");
                }
            },
            nextPage() {
                if (currentPage < pages.length - 1) {
                    setCurrentPage((p) => p + 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                } else if (hasNextChapter) {
                    onChapterChange("next");
                }
            },
            goToPage(page: number) {
                const target = Math.max(0, Math.min(page, pages.length - 1));
                setCurrentPage(target);
                window.scrollTo({ top: 0, behavior: "instant" });
            },
        }),
        [
            currentPage,
            pages.length,
            hasPrevChapter,
            hasNextChapter,
            onChapterChange,
        ],
    );

    useEffect(() => {
        onPageChange?.(currentPage);
    }, [currentPage, onPageChange]);

    function goToPage(page: number) {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function showFeedback(side: "left" | "right") {
        setTapFeedback(side);
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        tapTimerRef.current = setTimeout(() => setTapFeedback(null), 300);
    }

    function handleTap(side: "left" | "right") {
        if (side === "left" && currentPage > 0) {
            goToPage(currentPage - 1);
            showFeedback("left");
        } else if (side === "right" && currentPage < pages.length - 1) {
            goToPage(currentPage + 1);
            showFeedback("right");
        }
    }

    if (!pages.length) {
        return null;
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <div
                style={{
                    maxWidth: `${zoom}px`,
                    width: "100%",
                    margin: "0 auto",
                }}
                className="relative"
            >
                <ChapterImage
                    key={page.id}
                    src={page.url}
                    alt={`Página ${currentPage + 1}`}
                    onAllRetriesFailed={onImageFailed}
                />
                <div className="absolute inset-0 flex">
                    <button
                        className="flex-1 h-full active:bg-white/5 transition-colors"
                        onClick={() => handleTap("left")}
                        aria-label="Página anterior"
                    />
                    <button
                        className="flex-1 h-full active:bg-white/5 transition-colors"
                        onClick={() => handleTap("right")}
                        aria-label="Página siguiente"
                    />
                </div>
                {tapFeedback && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/30 rounded-full p-3">
                            {tapFeedback === "left" ? (
                                <ChevronLeft className="h-6 w-6 text-white" />
                            ) : (
                                <ChevronRight className="h-6 w-6 text-white" />
                            )}
                        </div>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-3 py-2">
                <button
                    onClick={() => goToPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-30"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-muted-foreground tabular-nums">
                    {currentPage + 1} / {pages.length}
                </span>
                <button
                    onClick={() =>
                        goToPage(Math.min(pages.length - 1, currentPage + 1))
                    }
                    disabled={currentPage === pages.length - 1}
                    className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-30"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
});

const ChapterSelect = forwardRef<
    HTMLButtonElement,
    {
        chapters: { id: number; name: string; chapterNumber: number }[];
        currentChapterId: string;
        slug: string;
    }
>(function ChapterSelect({ chapters, currentChapterId, slug }, ref) {
    const navigate = useNavigate();
    const location = useLocation();

    const sorted = useMemo(
        () =>
            [...chapters].sort((a, b) => {
                const numA = typeof a.chapterNumber === "number" ? a.chapterNumber : Number.parseFloat(a.name);
                const numB = typeof b.chapterNumber === "number" ? b.chapterNumber : Number.parseFloat(b.name);
                if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
                    return numB - numA;
                }
                return b.name.localeCompare(a.name);
            }),
        [chapters],
    );

    return (
        <Select
            value={currentChapterId}
            onValueChange={(id) => {
                navigate(`/manga/${slug}/capitulo/${id}`, {
                    state: { from: location.state?.from ?? "/mangas" },
                });
            }}
        >
            <SelectTrigger
                ref={ref}
                size="sm"
                className="w-auto min-w-[80px] text-xs border-white/10 bg-white/5"
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent
                align="end"
                style={{ maxHeight: "18rem" }}
                className="overflow-y-auto overscroll-contain [&_[data-slot='select-scroll-up-button']]:hidden [&_[data-slot='select-scroll-down-button']]:hidden"
            >
                {sorted.map((ch) => (
                    <SelectItem
                        key={ch.id}
                        value={String(ch.id)}
                        className="text-xs"
                    >
                        Cap. {ch.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
});

export default function ChapterReader() {
    const { slug, chapterId } = useParams<{
        slug: string;
        chapterId: string;
    }>();

    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from ?? "/mangas";

    const {
        chapter,
        loading,
        error,
        refetch: refetchChapter,
    } = useChapterPages(slug ?? null, chapterId ? Number(chapterId) : null);

    const { series, refetch: refetchSeries } = useSeriesDetail(slug ?? "");
    const chapters = useMemo(() => series?.chapters ?? [], [series]);
    const { readIds, markUntil, refetch } = useReadChapters(
        series?.id ?? 0,
        chapters,
    );
    const prevChapterIdRef = useRef(chapterId);

    useEffect(() => {
        if (chapterId && chapterId !== prevChapterIdRef.current) {
            prevChapterIdRef.current = chapterId;
            refetch();
        }
    }, [chapterId, refetch]);

    const headerVisible = useHideOnScrollDown();

    const [prefs, setPrefs] = useState<ReaderPrefs>(loadPrefs);

    const paginationRef = useRef<PaginationReaderHandle>(null);
    const chapterSelectRef = useRef<HTMLButtonElement>(null);

    const { pull, refreshing } = usePullToRefresh(() =>
        Promise.all([refetchChapter(), refetchSeries()]),
    );

    const markUntilRef = useRef(markUntil);
    useEffect(() => {
        markUntilRef.current = markUntil;
    });

    const [paginationPage, setPaginationPage] = useState(0);

    const { restore, savedPage, loaded } = useChapterProgress({
        chapterId: Number(chapterId),
        totalPages: chapter?.pages.length ?? 0,
        readMode: prefs.mode,
        currentPage: prefs.mode === "pagination" ? paginationPage : undefined,
    });

    const activePages = useMemo(() => {
        if (!chapter) return [];
        if (chapter.fallbackPages?.length) return chapter.fallbackPages;
        return chapter.pages ?? [];
    }, [chapter]);

    useEffect(() => {
        if (!chapter || !series) return;
        if (readIds.has(chapter.chapterId)) return;

        markUntilRef.current(chapter.chapterId).finally(() => {});
    }, [chapter, series, readIds]);

    const handlePrevPage = useCallback(() => {
        if (prefs.mode === "pagination") {
            paginationRef.current?.prevPage();
        } else {
            window.scrollBy({
                top: -window.innerHeight * 0.8,
                behavior: "smooth",
            });
        }
    }, [prefs.mode]);

    const handleNextPage = useCallback(() => {
        if (prefs.mode === "pagination") {
            paginationRef.current?.nextPage();
        } else {
            window.scrollBy({
                top: window.innerHeight * 0.8,
                behavior: "smooth",
            });
        }
    }, [prefs.mode]);

    const handleToggleMode = useCallback(() => {
        const next: ReadMode =
            prefs.mode === "cascade" ? "pagination" : "cascade";
        const updated = { ...prefs, mode: next };
        setPrefs(updated);
        savePrefs(updated);
    }, [prefs]);

    const handleToggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    }, []);

    const handleEscape = useCallback(() => {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
    }, []);

    const handleChapterChange = useCallback(
        (direction: "prev" | "next") => {
            if (direction === "prev" && chapter?.prev) {
                navigate(`/manga/${slug}/capitulo/${chapter.prev.id}`, {
                    state: { from },
                });
            } else if (direction === "next" && chapter?.next) {
                markUntilRef.current(chapter.next.id);
                navigate(`/manga/${slug}/capitulo/${chapter.next.id}`, {
                    state: { from },
                });
            }
        },
        [chapter, slug, navigate, from],
    );

    useKeyboardReader(
        {
            onPrevPage: handlePrevPage,
            onNextPage: handleNextPage,
            onToggleMode: handleToggleMode,
            onToggleFullscreen: handleToggleFullscreen,
            onOpenChapterSelector: useCallback(
                () => chapterSelectRef.current?.focus(),
                [],
            ),
            onEscape: handleEscape,
        },
        !loading && !error && !!chapter,
    );

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

    useEffect(() => {
        if (!chapter) return;
        document.title = `${chapter.series.name} — Cap. ${chapter.name}`;
        return () => {
            document.title = "Mangalovers";
        };
    }, [chapter]);

    useEffect(() => {
        if (!chapter || !loaded) return;

        if (prefs.mode === "cascade") {
            if (savedPage == null) {
                window.scrollTo(0, 0);
                return;
            }

            let attempts = 0;
            const maxAttempts = 15;
            const timers: ReturnType<typeof setTimeout>[] = [];

            function tryRestore() {
                if (restore()) return true;
                attempts++;
                if (attempts < maxAttempts) {
                    const delay = 300 * Math.pow(1.4, attempts);
                    const t = setTimeout(tryRestore, delay);
                    timers.push(t);
                }
                return false;
            }

            tryRestore();
            return () => timers.forEach(clearTimeout);
        }

        if (prefs.mode === "pagination" && savedPage != null && savedPage > 0) {
            const t = setTimeout(() => {
                paginationRef.current?.goToPage(savedPage);
            }, 300);
            return () => clearTimeout(t);
        }
    }, [chapter, loaded, prefs.mode, restore, savedPage]);

    const currentChapterNumber = chapter ? (chapter.number ?? Number.parseFloat(chapter.name)) : 0;
    const totalChapters = series?.chapters.length ?? 0;

    const chaptersLeft =
        totalChapters > 0 && chapter
            ? Math.max(
                  0,
                  totalChapters -
                      series!.chapters.filter(
                          (c) =>
                              Number.parseFloat(c.name) <= currentChapterNumber,
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
            <>
                <SEO
                    title={
                        chapter
                            ? `${chapter.series.name} — Cap. ${chapter.name}`
                            : "Cargando..."
                    }
                    description={
                        chapter
                            ? `Lee el capítulo ${chapter.name} de ${chapter.series.name} en Mangalovers.`
                            : undefined
                    }
                    canonicalPath={
                        chapter
                            ? `/manga/${slug}/capitulo/${chapterId}`
                            : undefined
                    }
                />
                <div className="min-h-screen bg-[#0a0a0f] dark:bg-[#06060b] flex flex-col items-center py-10 gap-4 px-4">
                    <Skeleton className="h-5 w-40 mb-6" />
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            className="w-full max-w-2xl h-96 rounded-lg"
                        />
                    ))}
                </div>
            </>
        );
    }

    if (error || !chapter) {
        return (
            <>
                <SEO title="Capítulo no encontrado" noIndex />
                <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center px-4">
                    <h2 className="text-xl font-bold">
                        Capítulo no encontrado
                    </h2>
                    <button
                        onClick={() =>
                            navigate(`/manga/${slug}`, { state: { from } })
                        }
                        className="text-sm text-primary underline underline-offset-4"
                    >
                        Volver a la serie
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            <SEO
                title={`${chapter.series.name} — Cap. ${chapter.name}`}
                description={`Lee el capítulo ${chapter.name} de ${chapter.series.name} en Mangalovers.`}
                canonicalPath={`/manga/${slug}/capitulo/${chapterId}`}
            />
            <JsonLd
                schema={{
                    "@context": "https://schema.org",
                    "@type": "BreadcrumbList",
                    itemListElement: [
                        {
                            "@type": "ListItem",
                            position: 1,
                            name: "Inicio",
                            item: "https://mangalovers.josenunez.cl/",
                        },
                        {
                            "@type": "ListItem",
                            position: 2,
                            name: chapter.series.name,
                            item: `https://mangalovers.josenunez.cl/manga/${slug}`,
                        },
                        {
                            "@type": "ListItem",
                            position: 3,
                            name: `Cap. ${chapter.name}`,
                            item: `https://mangalovers.josenunez.cl/manga/${slug}/capitulo/${chapterId}`,
                        },
                    ],
                }}
            />
            <PullToRefresh pull={pull} refreshing={refreshing} />

            <div className="min-h-screen bg-[#0a0a0f] dark:bg-[#06060b]">
                <div
                    className={`sticky top-0 z-40 bg-[#0a0a0f]/80 dark:bg-[#06060b]/80 backdrop-blur border-b border-white/5 transition-transform duration-300 ${
                        headerVisible ? "translate-y-0" : "-translate-y-full"
                    }`}
                >
                    <div className="container mx-auto max-w-3xl">
                        <div className="grid grid-cols-[auto_1fr_auto] items-center px-4 h-14 md:h-16">
                            <SidebarTrigger />
                            <div className="flex justify-center min-w-0">
                                <button
                                    onClick={() =>
                                        navigate(`/manga/${slug}`, {
                                            state: { from },
                                        })
                                    }
                                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group truncate"
                                >
                                    <ChevronLeft className="h-4 w-4 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
                                    <span className="truncate max-w-[240px] md:max-w-[250px]">
                                        {chapter.series.name}
                                    </span>
                                </button>
                            </div>
                            <ChapterSelect
                                ref={chapterSelectRef}
                                chapters={chapters}
                                currentChapterId={chapterId!}
                                slug={slug!}
                            />
                        </div>
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
                    onNext={markUntil}
                />

                {prefs.mode === "cascade" ? (
                    <div
                        className="flex flex-col items-center gap-1 mx-auto"
                        style={{ maxWidth: `${prefs.zoom}px`, width: "100%" }}
                    >
                        {activePages.map((page, index) => (
                            <div key={page.id} data-chapter-image={index} className="w-full scroll-mt-16">
                                <ChapterImage
                                    src={page.url}
                                    alt={`Página ${index + 1}`}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <PaginationReader
                        key={activePages[0]?.id ?? chapterId}
                        ref={paginationRef}
                        pages={activePages}
                        zoom={prefs.zoom}
                        onChapterChange={handleChapterChange}
                        hasPrevChapter={!!chapter.prev}
                        hasNextChapter={!!chapter.next}
                        onPageChange={setPaginationPage}
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
                        <Progress
                            value={progressPercent}
                            className="h-1.5 [&>div]:bg-gradient-to-r [&>div]:from-brand [&>div]:to-brand-cyan"
                        />
                    </div>
                )}

                <ChapterNav
                    slug={slug!}
                    prev={chapter.prev}
                    next={chapter.next}
                    from={from}
                    onNext={markUntil}
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

                <Separator className="max-w-2xl mx-auto my-4" />

                <div className="max-w-2xl mx-auto px-4">
                    <CommentSection chapterId={chapter.chapterId} />
                </div>
            </div>
        </>
    );
}
