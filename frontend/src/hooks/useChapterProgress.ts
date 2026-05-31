import { useEffect, useRef, useState, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import {
    upsertChapterProgress,
    fetchChapterProgress,
} from "@/api/manga";

const STORAGE_PREFIX = "chapter_progress_";

interface SavedProgress {
    pageNumber: number | null;
    percentage: number | null;
}

function getLocalProgress(chapterId: number): SavedProgress | null {
    try {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}${chapterId}`);
        return raw ? (JSON.parse(raw) as SavedProgress) : null;
    } catch {
        return null;
    }
}

function saveLocalProgress(chapterId: number, progress: SavedProgress) {
    localStorage.setItem(
        `${STORAGE_PREFIX}${chapterId}`,
        JSON.stringify(progress),
    );
}

interface UseChapterProgressOptions {
    chapterId: number;
    totalPages: number;
    readMode: "cascade" | "pagination";
    currentPage?: number;
}

export function useChapterProgress({
    chapterId,
    totalPages,
    readMode,
    currentPage = 0,
}: UseChapterProgressOptions) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const latestRef = useRef({ pageNumber: 0, percentage: 0 });
    const [visiblePage, setVisiblePage] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const [savedPage, setSavedPage] = useState<number | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const savedRef = useRef<SavedProgress | null>(null);

    const effectivePage =
        readMode === "pagination" ? currentPage : visiblePage;
    const percentage =
        totalPages > 0
            ? Math.min(
                  Math.round(((effectivePage + 1) / totalPages) * 100),
                  100,
              )
            : 0;

    useEffect(() => {
        async function load() {
            let progress: SavedProgress | null = null;
            if (isAuthenticated) {
                try {
                    const data = await fetchChapterProgress(chapterId);
                    if (data) progress = data;
                } catch {
                    // fall through to localStorage
                }
            }
            if (!progress) {
                progress = getLocalProgress(chapterId);
            }
            if (progress && progress.percentage === 100) {
                progress = null;
            }
            savedRef.current = progress;
            setSavedPage(progress?.pageNumber ?? null);
            setLoaded(true);
        }
        load();
    }, [chapterId, isAuthenticated]);

    const save = useCallback(
        async (pageNum: number, pct: number) => {
            if (isAuthenticated) {
                try {
                    await upsertChapterProgress(chapterId, {
                        pageNumber: pageNum,
                        percentage: pct,
                    });
                } catch {
                    saveLocalProgress(chapterId, {
                        pageNumber: pageNum,
                        percentage: pct,
                    });
                }
            } else {
                saveLocalProgress(chapterId, {
                    pageNumber: pageNum,
                    percentage: pct,
                });
            }
        },
        [chapterId, isAuthenticated],
    );

    // Track latest position immediately (not just on save)
    useEffect(() => {
        latestRef.current = { pageNumber: effectivePage, percentage };
    }, [effectivePage, percentage]);

    // Cascade: debounced save
    useEffect(() => {
        if (!loaded) return;

        if (readMode === "cascade") {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                save(effectivePage, percentage);
            }, 2000);

            return () => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
            };
        }
    }, [effectivePage, percentage, save, readMode, loaded]);

    // Pagination: save immediately
    useEffect(() => {
        if (readMode !== "pagination") return;
        if (!loaded) return;
        save(effectivePage, percentage);
    }, [effectivePage, percentage, readMode, loaded, save]);

    // beforeunload + on page navigate away
    useEffect(() => {
        function onBeforeUnload() {
            const cur = latestRef.current;
            if (cur.pageNumber > 0 || cur.percentage > 0) {
                saveLocalProgress(chapterId, {
                    pageNumber: cur.pageNumber,
                    percentage: cur.percentage,
                });
                return;
            }
            if (readMode === "cascade") {
                const elements =
                    document.querySelectorAll<HTMLElement>(
                        "[data-chapter-image]",
                    );
                if (elements.length === 0) return;
                let page = 0;
                for (let i = 0; i < elements.length; i++) {
                    if (elements[i].getBoundingClientRect().bottom > 0) {
                        page = i;
                        break;
                    }
                }
                const pct = Math.min(
                    Math.round(((page + 1) / elements.length) * 100),
                    100,
                );
                saveLocalProgress(chapterId, {
                    pageNumber: page,
                    percentage: pct,
                });
            }
        }
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", onBeforeUnload);
            const cur = latestRef.current;
            if (cur.pageNumber > 0 || cur.percentage > 0) {
                saveLocalProgress(chapterId, {
                    pageNumber: cur.pageNumber,
                    percentage: cur.percentage,
                });
                if (isAuthenticated) {
                    upsertChapterProgress(chapterId, {
                        pageNumber: cur.pageNumber,
                        percentage: cur.percentage,
                    }).catch(() => {});
                }
            }
        };
    }, [chapterId, isAuthenticated, readMode]);

    // IntersectionObserver for cascade mode
    useEffect(() => {
        if (readMode !== "cascade") return;
        if (!loaded) return;

        const images =
            document.querySelectorAll<HTMLElement>("[data-chapter-image]");
        if (images.length === 0) return;

        const visiblePages = new Set<number>();

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    const index = Number(
                        entry.target.getAttribute("data-chapter-image"),
                    );
                    if (entry.isIntersecting) {
                        visiblePages.add(index);
                    } else {
                        visiblePages.delete(index);
                    }
                }
                if (visiblePages.size > 0) {
                    const page = Math.min(...visiblePages);
                    setVisiblePage(page);
                    const pct = Math.min(
                        Math.round(((page + 1) / images.length) * 100),
                        100,
                    );
                    latestRef.current = {
                        pageNumber: page,
                        percentage: pct,
                    };
                }
            },
            { threshold: 0.1 },
        );

        images.forEach((img) => observer.observe(img));
        return () => observer.disconnect();
    }, [readMode, loaded, chapterId]);

    // Cascade: scroll-based ref sync for real-time accuracy
    useEffect(() => {
        if (readMode !== "cascade") return;
        if (!loaded) return;

        let rafId = 0;

        function onScroll() {
            if (rafId) return;
            rafId = requestAnimationFrame(() => {
                rafId = 0;
                const elements =
                    document.querySelectorAll<HTMLElement>(
                        "[data-chapter-image]",
                    );
                if (elements.length === 0) return;
                let page = 0;
                for (let i = 0; i < elements.length; i++) {
                    if (elements[i].getBoundingClientRect().bottom > 0) {
                        page = i;
                        break;
                    }
                }
                const pct = Math.min(
                    Math.round(((page + 1) / elements.length) * 100),
                    100,
                );
                latestRef.current = { pageNumber: page, percentage: pct };
            });
        }

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [readMode, loaded, chapterId]);

    const restore = useCallback(() => {
        if (!loaded) return false;
        if (!savedRef.current || savedRef.current.pageNumber == null)
            return false;

        const targetIndex = savedRef.current.pageNumber;

        if (readMode === "cascade") {
            const el = document.querySelector<HTMLElement>(
                `[data-chapter-image="${targetIndex}"]`,
            );
            if (el) {
                el.scrollIntoView({ block: "start" });
                return true;
            }
        }
        return false;
    }, [readMode, loaded]);

    return {
        restore,
        savedPage,
        pageNumber: effectivePage,
        percentage,
        loaded,
    };
}
