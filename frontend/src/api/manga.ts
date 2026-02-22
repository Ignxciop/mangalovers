import { api } from "@/api/axios.ts";
import type { Manga, MangaListResponse, SeriesDetail } from "@/types/manga";

export async function fetchLatestManga(limit = 16): Promise<Manga[]> {
    const { data } = await api.get<Manga[]>("/manga/latest", {
        params: { limit },
    });

    return data;
}

export async function fetchMangaList(
    params: Record<string, string | number>,
): Promise<MangaListResponse> {
    const { data } = await api.get<MangaListResponse>("/manga", {
        params,
    });

    return data;
}

export async function fetchSeriesDetail(slug: string): Promise<SeriesDetail> {
    const { data } = await api.get<SeriesDetail>(`/manga/${slug}`);
    return data;
}
