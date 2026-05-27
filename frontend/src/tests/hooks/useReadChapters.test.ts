import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useReadChapters } from "@/hooks/useReadChapters";
import { useAuthStore } from "@/store/authStore";

const mockFetchReadChapterIds = vi.fn();
const mockToggleChapterRead = vi.fn();
const mockMarkChapterUntil = vi.fn();

vi.mock("@/api/manga", () => ({
    fetchReadChapterIds: (...args: any[]) => mockFetchReadChapterIds(...args),
    toggleChapterRead: (...args: any[]) => mockToggleChapterRead(...args),
    markChapterUntil: (...args: any[]) => mockMarkChapterUntil(...args),
}));

let mockIsAuthenticated = true;
vi.mock("@/store/authStore", () => ({
    useAuthStore: vi.fn((selector?: (s: { isAuthenticated: boolean }) => any) => {
        const state = { isAuthenticated: mockIsAuthenticated };
        return selector ? selector(state) : state;
    }),
}));

function setAuthenticated(value: boolean) {
    mockIsAuthenticated = value;
}

const MOCK_CHAPTERS = [
    { id: 1, name: "1", publishedAt: "2024-01-01", createdAt: "2024-01-01", chapterNumber: 1 },
    { id: 2, name: "2", publishedAt: "2024-01-02", createdAt: "2024-01-02", chapterNumber: 2 },
    { id: 3, name: "3", publishedAt: "2024-01-03", createdAt: "2024-01-03", chapterNumber: 3 },
];

describe("useReadChapters", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        setAuthenticated(true);
    });

    describe("al montar", () => {
        it("fetch de read IDs desde API cuando está autenticado", async () => {
            mockFetchReadChapterIds.mockResolvedValue([1, 3]);

            const { result } = renderHook(() => useReadChapters(1, MOCK_CHAPTERS));

            await waitFor(() => {
                expect(result.current.readIds.has(1)).toBe(true);
                expect(result.current.readIds.has(2)).toBe(false);
                expect(result.current.readIds.has(3)).toBe(true);
            });

            expect(mockFetchReadChapterIds).toHaveBeenCalledWith(1);
            expect(mockFetchReadChapterIds).toHaveBeenCalledTimes(1);
        });

        it("carga desde localStorage cuando NO está autenticado", async () => {
            setAuthenticated(false);
            localStorage.setItem("read_chapters_1", JSON.stringify([1, 2]));

            const { result } = renderHook(() => useReadChapters(1, MOCK_CHAPTERS));

            await waitFor(() => {
                expect(result.current.readIds.has(1)).toBe(true);
                expect(result.current.readIds.has(2)).toBe(true);
                expect(result.current.readIds.has(3)).toBe(false);
            });

            expect(mockFetchReadChapterIds).not.toHaveBeenCalled();
        });

        it("no fetch si seriesId es 0", async () => {
            renderHook(() => useReadChapters(0, MOCK_CHAPTERS));

            await waitFor(() => {
                expect(mockFetchReadChapterIds).not.toHaveBeenCalled();
            });
        });

        it("readIds vacío si el fetch falla", async () => {
            mockFetchReadChapterIds.mockRejectedValue(new Error("Network error"));

            const { result } = renderHook(() => useReadChapters(1, MOCK_CHAPTERS));

            await waitFor(() => {
                expect(result.current.readIds.size).toBe(0);
            });
        });
    });

    describe("toggle", () => {
        it("llama toggleChapterRead API cuando está autenticado", async () => {
            mockFetchReadChapterIds.mockResolvedValue([1]);
            mockToggleChapterRead.mockResolvedValue({ read: true });

            const { result } = renderHook(() => useReadChapters(1, MOCK_CHAPTERS));

            await waitFor(() => expect(result.current.readIds.has(1)).toBe(true));

            await act(async () => {
                await result.current.toggle(2);
            });

            expect(mockToggleChapterRead).toHaveBeenCalledWith(2);
        });

        it("marca capítulo en localStorage cuando NO está autenticado", async () => {
            setAuthenticated(false);

            const { result } = renderHook(() => useReadChapters(1, MOCK_CHAPTERS));

            await act(async () => {
                await result.current.toggle(2);
            });

            expect(result.current.readIds.has(1)).toBe(true);
            expect(result.current.readIds.has(2)).toBe(true);

            const stored = JSON.parse(localStorage.getItem("read_chapters_1") ?? "[]");
            expect(stored).toContain(1);
            expect(stored).toContain(2);
        });

        it("desmarca capítulo y siguientes en localStorage, anteriores quedan", async () => {
            setAuthenticated(false);

            const { result } = renderHook(() => useReadChapters(1, MOCK_CHAPTERS));

            await act(async () => {
                await result.current.toggle(2);
            });
            expect(result.current.readIds.has(1)).toBe(true);
            expect(result.current.readIds.has(2)).toBe(true);

            await act(async () => {
                await result.current.toggle(2);
            });

            expect(result.current.readIds.has(1)).toBe(true);
            expect(result.current.readIds.has(2)).toBe(false);
            expect(result.current.readIds.has(3)).toBe(false);
        });
    });

    describe("markUntil", () => {
        it("llama markChapterUntil API cuando está autenticado", async () => {
            mockFetchReadChapterIds.mockResolvedValue([1]);
            mockMarkChapterUntil.mockResolvedValue({
                updated: 2,
                seriesId: 1,
                seriesName: "Test",
                newChapters: [{ id: 2, name: "2" }, { id: 3, name: "3" }],
            });

            const { result } = renderHook(() => useReadChapters(1, MOCK_CHAPTERS));

            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.markUntil(3);
            });

            expect(mockMarkChapterUntil).toHaveBeenCalledWith(3);
        });

        it("marca hasta el capítulo en localStorage cuando NO está autenticado", async () => {
            setAuthenticated(false);

            const { result } = renderHook(() => useReadChapters(1, MOCK_CHAPTERS));

            await act(async () => {
                await result.current.markUntil(2);
            });

            expect(result.current.readIds.has(1)).toBe(true);
            expect(result.current.readIds.has(2)).toBe(true);
            expect(result.current.readIds.has(3)).toBe(false);
        });
    });

    describe("refetch", () => {
        it("vuelve a fetch read IDs", async () => {
            mockFetchReadChapterIds.mockResolvedValue([1]);

            const { result } = renderHook(() => useReadChapters(1, MOCK_CHAPTERS));

            await waitFor(() => expect(result.current.readIds.has(1)).toBe(true));

            mockFetchReadChapterIds.mockResolvedValue([1, 2, 3]);

            await act(async () => {
                await result.current.refetch();
            });

            expect(result.current.readIds.has(2)).toBe(true);
            expect(result.current.readIds.has(3)).toBe(true);
            expect(mockFetchReadChapterIds).toHaveBeenCalledTimes(2);
        });
    });
});
