import { useEffect, useState } from "react";
import { fetchChapterPages } from "@/api/manga";
import type { ChapterPages } from "@/types/manga";

interface UseChapterPagesResult {
    chapter: ChapterPages | null;
    loading: boolean;
    error: string | null;
}

export function useChapterPages(
    slug: string | null,
    chapterId: number | null,
): UseChapterPagesResult {
    const [chapter, setChapter] = useState<ChapterPages | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!chapterId || !slug) return;

        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                const data = await fetchChapterPages(slug, chapterId!);
                if (!cancelled) setChapter(data);
            } catch (err: unknown) {
                if (!cancelled) {
                    setError("No se pudieron cargar las páginas");
                    console.error(err);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [slug, chapterId]);

    return { chapter, loading, error };
}
