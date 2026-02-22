export interface Manga {
    id: number;
    name: string;
    slug: string;
    cover: string | null;
    chapterCount: number;
    lastChapterPublishedAt: string | null;
}

export interface MangaListResponse {
    manga: Manga[];
    total: number;
    page: number;
    totalPages: number;
}

export interface Chapter {
    id: number;
    name: string;
    publishedAt: string;
    createdAt: string;
}

export interface SeriesProvider {
    provider: string;
    externalSlug: string;
    externalUrl: string | null;
}

export interface SeriesDetail {
    id: number;
    name: string;
    slug: string;
    cover: string | null;
    status: string | null;
    summary: string | null;
    chapterCount: number;
    genres: string[];
    providers: SeriesProvider[];
    chapters: Chapter[];
}
