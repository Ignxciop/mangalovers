import { useEffect, useState } from "react";
import { fetchMangaList } from "@/api/manga.ts";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { useAuthStore } from "@/store/authStore";
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
    const { search: rawSearch, page, status, type, provider, sort, order, genres, read } = params;

    const search = useDebounce(rawSearch, 300);

    const user = useAuthStore((s) => s.user);
    const cacheKey = `manga-list:${user?.id ?? "anon"}:${JSON.stringify({ search, page, status, type, provider, sort, order, genres, read })}`;

    return useCachedQuery<MangaListResponse | null>(
        cacheKey,
        (signal) => fetchMangaList(
            { page, search, status, type, provider, sort, order, genres, read },
            signal,
        ),
        { ttl: 30_000, initialData: null },
    );
}