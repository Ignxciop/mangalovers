import { useEffect, useState } from "react";
import { fetchReadChapterIds, toggleChapterRead } from "@/api/manga";

export function useReadChapters(seriesId: number) {
    const [readIds, setReadIds] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!seriesId) return;
        fetchReadChapterIds(seriesId)
            .then((ids) => setReadIds(new Set(ids)))
            .catch(() => setReadIds(new Set()))
            .finally(() => setLoading(false));
    }, [seriesId]);

    async function toggle(chapterId: number) {
        // Optimistic update
        setReadIds((prev) => {
            const next = new Set(prev);
            next.has(chapterId) ? next.delete(chapterId) : next.add(chapterId);
            return next;
        });

        try {
            const { read } = await toggleChapterRead(chapterId);
            setReadIds((prev) => {
                const next = new Set(prev);
                read ? next.add(chapterId) : next.delete(chapterId);
                return next;
            });
        } catch {
            // Revert on error
            setReadIds((prev) => {
                const next = new Set(prev);
                next.has(chapterId)
                    ? next.delete(chapterId)
                    : next.add(chapterId);
                return next;
            });
        }
    }

    return { readIds, loading, toggle };
}
