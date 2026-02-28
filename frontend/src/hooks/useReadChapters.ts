import { useEffect, useState, useCallback } from "react";
import { fetchReadChapterIds, toggleChapterRead } from "@/api/manga";
import { useAuthStore } from "@/store/authStore";

export function useReadChapters(seriesId: number) {
    const [readIds, setReadIds] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    const load = useCallback(async () => {
        if (!seriesId || !isAuthenticated) return;
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

    async function toggle(chapterId: number) {
        if (!isAuthenticated) return;
        const isRead = readIds.has(chapterId);

        setReadIds((prev) => {
            const next = new Set(prev);
            if (isRead) {
                next.add(chapterId);
            } else {
                next.delete(chapterId);
            }
            return next;
        });

        try {
            await toggleChapterRead(chapterId);
            const ids = await fetchReadChapterIds(seriesId);
            setReadIds(new Set(ids));
        } catch {
            setReadIds((prev) => {
                const next = new Set(prev);
                if (isRead) {
                    next.add(chapterId);
                } else {
                    next.delete(chapterId);
                }
                return next;
            });
        }
    }

    return { readIds, loading, toggle, refetch: load };
}
