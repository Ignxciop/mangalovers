import { useEffect, useState } from "react";
import { fetchSeriesDetail } from "@/api/manga";
import type { SeriesDetail } from "@/types/manga";

interface UseSeriesDetailResult {
    series: SeriesDetail | null;
    loading: boolean;
    error: string | null;
}

export function useSeriesDetail(slug: string): UseSeriesDetailResult {
    const [series, setSeries] = useState<SeriesDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) return;

        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                const data = await fetchSeriesDetail(slug);
                if (!cancelled) setSeries(data);
            } catch (err: unknown) {
                if (!cancelled) {
                    setError("No se pudo cargar la serie");
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
    }, [slug]);

    return { series, loading, error };
}
