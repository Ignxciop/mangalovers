import { useEffect, useState } from "react";
import { fetchReadChapterIds, toggleChapterRead } from "@/api/manga";
import { useAuthStore } from "@/store/authStore";

export function useReadChapters(seriesId: number) {
    const [readIds, setReadIds] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    useEffect(() => {
        if (!seriesId || !isAuthenticated) return;

        async function load() {
            setLoading(true);
            try {
                const ids = await fetchReadChapterIds(seriesId);
                setReadIds(new Set(ids));
            } catch {
                setReadIds(new Set());
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [seriesId, isAuthenticated]);

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

    return { readIds, loading, toggle };
}
