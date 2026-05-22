import { useEffect, useState } from "react";
import { fetchMangaList } from "@/api/manga.ts";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import type { MangaListResponse } from "@/types/manga";

function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}

export function useMangaList(params: Record<string, string | number>) {
    const { search: rawSearch, page, status, type, provider, sort, order, genres } = params;

    const search = useDebounce(rawSearch, 300);

    const cacheKey = `manga-list:${JSON.stringify({ search, page, status, type, provider, sort, order, genres })}`;

    return useCachedQuery<MangaListResponse | null>(
        cacheKey,
        (signal) => fetchMangaList(
            { page, search, status, type, provider, sort, order, genres },
            signal,
        ),
        { ttl: 30_000, initialData: null },
    );
}