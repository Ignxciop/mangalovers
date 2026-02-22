import { api } from "@/api/axios.ts";
import type {
    Manga,
    MangaListResponse,
    SeriesDetail,
    ChapterPages,
} from "@/types/manga";

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

export async function fetchChapterPages(
    chapterId: number,
): Promise<ChapterPages> {
    const { data } = await api.get<ChapterPages>(
        `/manga/capitulo/${chapterId}/pages`,
    );
    return data;
}

export async function fetchFavorites() {
    const { data } = await api.get("/favorites");
    return data;
}

export async function fetchFavorite(seriesId: number) {
    const { data } = await api.get(`/favorites/${seriesId}`);
    return data;
}

export async function upsertFavorite(seriesId: number, status: string) {
    const { data } = await api.post("/favorites", { seriesId, status });
    return data;
}

export async function deleteFavorite(seriesId: number) {
    const { data } = await api.delete(`/favorites/${seriesId}`);
    return data;
}

export async function fetchReadChapterIds(seriesId: number): Promise<number[]> {
    const { data } = await api.get<number[]>(`/reads/series/${seriesId}`);
    return data;
}

export async function toggleChapterRead(
    chapterId: number,
): Promise<{ read: boolean }> {
    const { data } = await api.post<{ read: boolean }>(
        `/reads/chapter/${chapterId}/toggle`,
    );
    return data;
}
