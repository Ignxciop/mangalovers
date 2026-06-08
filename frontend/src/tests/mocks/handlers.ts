import { http, HttpResponse } from "msw";
import type { SeriesDetail, ChapterPages } from "@/types/manga";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4008/api";

export const mockSeries: SeriesDetail = {
    id: 1,
    name: "Test Serie",
    slug: "test-serie",
    cover: null,
    fallbackCover: null,
    status: "Activo",
    type: "Manga",
    summary: "Una serie de prueba",
    chapterCount: 3,
    genres: ["Acción", "Aventura"],
    providers: [],
    chapters: [
        { id: 1, name: "1", publishedAt: "2024-01-01", createdAt: "2024-01-01", chapterNumber: 1 },
        { id: 2, name: "2", publishedAt: "2024-01-02", createdAt: "2024-01-02", chapterNumber: 2 },
        { id: 3, name: "3", publishedAt: "2024-01-03", createdAt: "2024-01-03", chapterNumber: 3 },
    ],
};

export const mockChapterPages: ChapterPages = {
    chapterId: 2,
    name: "2",
    number: 2,
    publishedAt: "2024-01-02",
    series: { id: 1, name: "Test Serie", slug: "test-serie" },
    prev: { id: 1, name: "1" },
    next: { id: 3, name: "3" },
    pages: [
        { id: 10, url: "https://example.com/page1.jpg" },
        { id: 11, url: "https://example.com/page2.jpg" },
    ],
};

export const handlers = [
    http.get(`${API_URL}/manga/:slug`, () => {
        return HttpResponse.json(mockSeries);
    }),

    http.get(`${API_URL}/manga/capitulo/:slug/:chapterId/pages`, () => {
        return HttpResponse.json(mockChapterPages);
    }),

    http.get(`${API_URL}/reads/series/:seriesId`, () => {
        return HttpResponse.json([1]);
    }),

    http.post(`${API_URL}/reads/chapter/:chapterId/toggle`, () => {
        return HttpResponse.json({ read: true });
    }),

    http.post(`${API_URL}/reads/chapter/:chapterId/mark-until`, () => {
        return HttpResponse.json({
            updated: 1,
            seriesId: 1,
            seriesName: "Test Serie",
            newChapters: [{ id: 2, name: "2" }],
        });
    }),
];
