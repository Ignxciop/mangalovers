import { useEffect, useState } from "react";
import { fetchMangaList } from "@/api/manga.ts";
import type { MangaListResponse } from "@/types/manga";

export function useMangaList(params: Record<string, string | number>) {
    const [data, setData] = useState<MangaListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                const result = await fetchMangaList(params);
                if (isMounted) setData(result);
            } catch (err) {
                if (isMounted) setError(err as Error);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        load();

        return () => {
            isMounted = false;
        };
    }, [params]);

    return { data, loading, error };
}
