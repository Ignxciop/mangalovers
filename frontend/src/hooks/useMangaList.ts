import { useEffect, useState } from "react";
import { fetchMangaList } from "@/api/manga.ts";
import type { MangaListResponse } from "@/types/manga";

export function useMangaList(params: Record<string, string | number>) {
    const [data, setData] = useState<MangaListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const abortController = new AbortController();

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const result = await fetchMangaList(params, abortController.signal);
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
    }, [
        params.page,
        params.search,
        params.status,
        params.type,
        params.provider,
        params.sort,
        params.order,
        params.genres,
    ]);

    return { data, loading, error };
}
