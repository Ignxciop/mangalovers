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
