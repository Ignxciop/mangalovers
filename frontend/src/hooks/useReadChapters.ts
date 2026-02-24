import { useEffect, useState } from "react";
import {
    fetchReadChapterIds,
    toggleChapterRead,
    markChapterUntil,
} from "@/api/manga";

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
        const isRead = readIds.has(chapterId);
        setReadIds((prev) => {
            const next = new Set(prev);
            isRead ? next.delete(chapterId) : next.add(chapterId);
            return next;
        });

        try {
            if (isRead) {
                await toggleChapterRead(chapterId);
            } else {
                await markChapterUntil(chapterId);
            }
            const ids = await fetchReadChapterIds(seriesId);
            setReadIds(new Set(ids));
        } catch {
            setReadIds((prev) => {
                const next = new Set(prev);
                isRead ? next.add(chapterId) : next.delete(chapterId);
                return next;
            });
        }
    }

    return { readIds, loading, toggle };
}
