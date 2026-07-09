import { api } from "@/api/axios.ts";
import type {
    Manga,
    MangaListResponse,
    SeriesDetail,
    ChapterPages,
    RecommendedResponse,
} from "@/types/manga";

export async function fetchLatestManga(limit = 16): Promise<Manga[]> {
    const { data } = await api.get<Manga[]>("/manga/latest", {
        params: { limit },
    });

    return data;
}

export async function fetchMangaList(
    params: Record<string, string | number>,
    signal?: AbortSignal,
): Promise<MangaListResponse> {
    const { data } = await api.get<MangaListResponse>("/manga", {
        params,
        signal,
    });

    return data;
}

export async function fetchSeriesDetail(slug: string): Promise<SeriesDetail> {
    const { data } = await api.get<SeriesDetail>(`/manga/${slug}`);
    return data;
}

export async function fetchChapterPages(
    slug: string,
    chapterId: number,
): Promise<ChapterPages> {
    const { data } = await api.get<ChapterPages>(
        `/manga/capitulo/${slug}/${chapterId}/pages`,
    );
    return data;
}

export async function fetchFavorites(params?: { page?: number; limit?: number }) {
    const { data } = await api.get("/favorites", { params });
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

export async function markChapterUntil(
    chapterId: number,
): Promise<{ updated: number; seriesId: number; seriesName: string; newChapters: { id: number; name: string }[] }> {
    const { data } = await api.post<{ updated: number; seriesId: number; seriesName: string; newChapters: { id: number; name: string }[] }>(
        `/reads/chapter/${chapterId}/mark-until`,
    );
    return data;
}

export async function fetchGenres(): Promise<{ id: number; name: string }[]> {
    const { data } = await api.get("/manga/genres");
    return data;
}

export async function fetchReadingStats() {
    const { data } = await api.get("/reads/stats");
    return data;
}

export async function upsertChapterProgress(
    chapterId: number,
    body: { pageNumber?: number | null; percentage?: number | null },
): Promise<{ pageNumber: number | null; percentage: number | null }> {
    const { data } = await api.put(`/reads/chapter/${chapterId}/progress`, body);
    return data;
}

export async function fetchChapterProgress(chapterId: number): Promise<{ pageNumber: number | null; percentage: number | null } | null> {
    const { data } = await api.get(`/reads/chapter/${chapterId}/progress`);
    return data;
}

export async function fetchSeriesProgress(seriesId: number): Promise<Array<{ chapterId: number; pageNumber: number | null; percentage: number | null; updatedAt: string }>> {
    const { data } = await api.get(`/reads/series/${seriesId}/progress`);
    return data;
}

export async function fetchFullStats() {
    const { data } = await api.get("/reads/full-stats");
    return data;
}

export async function fetchRecommended(): Promise<RecommendedResponse> {
    const { data } = await api.get<RecommendedResponse>("/manga/recommended");
    return data;
}
