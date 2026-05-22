import { useCachedQuery } from "@/hooks/useCachedQuery";
import { fetchSeriesDetail } from "@/api/manga";
import type { SeriesDetail } from "@/types/manga";

export function useSeriesDetail(slug: string) {
    const { data: series, ...rest } = useCachedQuery<SeriesDetail | null>(
        `series-detail:${slug}`,
        () => fetchSeriesDetail(slug),
        { ttl: 60_000, enabled: !!slug, initialData: null },
    );
    return { series, ...rest };
}
