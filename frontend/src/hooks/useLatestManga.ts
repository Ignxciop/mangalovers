import { useEffect, useState } from "react";
import { fetchLatestManga } from "@/api/manga.ts";
import type { Manga } from "@/types/manga";

export function useLatestManga(limit = 16) {
    const [data, setData] = useState<Manga[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                const result = await fetchLatestManga(limit);
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
    }, [limit]);

    return { data, loading, error };
}
