import { useEffect, useState } from "react";
import { fetchMangaList } from "@/api/manga.ts";
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

    const [data, setData] = useState<MangaListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const abortController = new AbortController();

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const result = await fetchMangaList(
                    { page, search, status, type, provider, sort, order, genres },
                    abortController.signal,
                );
                if (!abortController.signal.aborted) setData(result);
            } catch (err) {
                if (!abortController.signal.aborted) setError(err as Error);
            } finally {
                if (!abortController.signal.aborted) setLoading(false);
            }
        }

        load();

        return () => {
            abortController.abort();
        };
    }, [search, page, status, type, provider, sort, order, genres]);

    return { data, loading, error };
}