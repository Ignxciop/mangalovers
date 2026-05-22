import { useCachedQuery } from "@/hooks/useCachedQuery";
import { fetchChapterPages } from "@/api/manga";
import type { ChapterPages } from "@/types/manga";

export function useChapterPages(
    slug: string | null,
    chapterId: number | null,
) {
    const { data: chapter, ...rest } = useCachedQuery<ChapterPages | null>(
        chapterId && slug ? `chapter-pages:${slug}:${chapterId}` : "",
        () => fetchChapterPages(slug!, chapterId!),
        { ttl: 60_000, enabled: !!chapterId && !!slug, initialData: null },
    );
    return { chapter, ...rest };
}
