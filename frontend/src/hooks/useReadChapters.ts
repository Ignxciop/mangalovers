import { useEffect, useState, useCallback, useRef } from "react";
import {
    fetchReadChapterIds,
    toggleChapterRead,
    markChapterUntil,
} from "@/api/manga";
import { useAuthStore } from "@/store/authStore";
import type { Chapter } from "@/types/manga";

const STORAGE_PREFIX = "read_chapters_";
const LAST_READ_PREFIX = "last_read_name_";

function getLocalReadIds(seriesId: number): Set<number> {
    try {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}${seriesId}`);
        if (!raw) return new Set();
        return new Set(JSON.parse(raw) as number[]);
    } catch {
        return new Set();
    }
}

function saveLocalReadIds(seriesId: number, ids: Set<number>) {
    localStorage.setItem(
        `${STORAGE_PREFIX}${seriesId}`,
        JSON.stringify([...ids]),
    );
}

export function getLocalLastReadName(seriesId: number): string | null {
    try {
        return localStorage.getItem(`${LAST_READ_PREFIX}${seriesId}`);
    } catch {
        return null;
    }
}

function setLocalLastReadName(seriesId: number, name: string) {
    localStorage.setItem(`${LAST_READ_PREFIX}${seriesId}`, name);
}

function clearLocalLastReadName(seriesId: number) {
    localStorage.removeItem(`${LAST_READ_PREFIX}${seriesId}`);
}

export function useReadChapters(seriesId: number, chapters: Chapter[] = []) {
    const [readIds, setReadIds] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const readIdsRef = useRef(readIds);
    readIdsRef.current = readIds;

    const load = useCallback(async () => {
        if (!seriesId) return;

        if (!isAuthenticated) {
            setReadIds(getLocalReadIds(seriesId));
            return;
        }

        setLoading(true);
        try {
            const ids = await fetchReadChapterIds(seriesId);
            setReadIds(new Set(ids));
        } catch {
            setReadIds(new Set());
        } finally {
            setLoading(false);
        }
    }, [seriesId, isAuthenticated]);

    useEffect(() => {
        load();
    }, [load]);

    const toggle = useCallback(
        async (chapterId: number) => {
            if (!isAuthenticated) {
                const targetChapter = chapters.find((c) => c.id === chapterId);
                if (!targetChapter) return;

                const targetNumber = parseFloat(targetChapter.name);

                setReadIds((prev) => {
                    const next = new Set(prev);
                    const isRead = next.has(chapterId);
                    if (isRead) {
                        chapters
                            .filter((c) => parseFloat(c.name) >= targetNumber)
                            .forEach((c) => next.delete(c.id));
                        const remaining = chapters
                            .filter((c) => next.has(c.id))
                            .sort((a, b) => parseFloat(b.name) - parseFloat(a.name));
                        if (remaining.length > 0) {
                            setLocalLastReadName(seriesId, remaining[0].name);
                        } else {
                            clearLocalLastReadName(seriesId);
                        }
                    } else {
                        chapters
                            .filter((c) => parseFloat(c.name) <= targetNumber)
                            .forEach((c) => next.add(c.id));
                        setLocalLastReadName(seriesId, targetChapter.name);
                    }
                    saveLocalReadIds(seriesId, next);
                    return next;
                });
                return;
            }

            const wasRead = readIdsRef.current.has(chapterId);

            setReadIds((prev) => {
                const next = new Set(prev);
                if (wasRead) next.delete(chapterId);
                else next.add(chapterId);
                return next;
            });

            try {
                await toggleChapterRead(chapterId);
                const ids = await fetchReadChapterIds(seriesId);
                setReadIds(new Set(ids));
            } catch {
                setReadIds((prev) => {
                    const next = new Set(prev);
                    if (wasRead) next.add(chapterId);
                    else next.delete(chapterId);
                    return next;
                });
            }
        },
        [isAuthenticated, seriesId, chapters],
    );

    const markUntil = useCallback(
        async (chapterId: number) => {
            if (!isAuthenticated) {
                const targetChapter = chapters.find((c) => c.id === chapterId);
                if (!targetChapter) return;

                const targetNumber = parseFloat(targetChapter.name);

                setReadIds((prev) => {
                    const next = new Set(prev);
                    chapters
                        .filter((c) => parseFloat(c.name) <= targetNumber)
                        .forEach((c) => next.add(c.id));
                    saveLocalReadIds(seriesId, next);
                    setLocalLastReadName(seriesId, targetChapter.name);
                    return next;
                });
                return;
            }

            try {
                await markChapterUntil(chapterId);
                const ids = await fetchReadChapterIds(seriesId);
                setReadIds(new Set(ids));
            } catch {
                // silencioso
            }
        },
        [isAuthenticated, seriesId, chapters],
    );

    return { readIds, loading, toggle, markUntil, refetch: load };
}
