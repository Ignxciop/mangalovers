import { useCachedQuery } from "@/hooks/useCachedQuery";
import { fetchLatestManga } from "@/api/manga.ts";
import type { Manga } from "@/types/manga";

export function useLatestManga(limit = 16) {
    const cacheKey = `latest-manga:${limit}`;
    return useCachedQuery<Manga[]>(
        cacheKey,
        () => fetchLatestManga(limit),
        { ttl: 30_000, initialData: [] },
    );
}
