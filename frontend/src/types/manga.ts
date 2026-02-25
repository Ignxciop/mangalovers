export interface Manga {
    id: number;
    name: string;
    slug: string;
    cover: string | null;
    chapterCount: number;
    lastChapterPublishedAt: string | null;
    lastAvailableChapterName?: string | null;
    lastReadChapterName?: string | null;
    providers?: string[];
    status?: string | null;
}

export interface MangaListResponse {
    data: Manga[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface Chapter {
    id: number;
    name: string;
    publishedAt: string;
    createdAt: string;
    chapterNumber: number;
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

export interface ChapterPages {
    chapterId: number;
    name: string;
    publishedAt: string;
    series: {
        id: number;
        name: string;
        slug: string;
    };
    prev: { id: number; name: string } | null;
    next: { id: number; name: string } | null;
    pages: {
        id: number;
        url: string;
    }[];
}

export interface Favorite {
    id: number;
    userId: string;
    seriesId: number;
    status: "Siguiendo" | "Terminado";
    createdAt: string;
    lastReadChapterName: string | null;
    lastAvailableChapterName: string | null;
    series: {
        id: number;
        name: string;
        slug: string;
        cover: string | null;
        status: string | null;
        chapterCount: number;
        lastChapterPublishedAt: string | null;
    };
}
