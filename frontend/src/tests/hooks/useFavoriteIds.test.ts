import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mockFetchFavorites = vi.fn();

vi.mock("@/api/manga", () => ({
    fetchFavorites: (...args: unknown[]) => mockFetchFavorites(...args),
}));

let mockIsAuthenticated = false;

vi.mock("@/store/authStore", () => ({
    useAuthStore: vi.fn((selector?: (s: Record<string, unknown>) => unknown) => {
        const state = { isAuthenticated: mockIsAuthenticated } as Record<string, unknown>;
        return selector ? selector(state) : state;
    }),
}));

import { useFavoriteIds } from "@/hooks/useFavoriteIds";

describe("useFavoriteIds", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsAuthenticated = true;
    });

    it("fetchFavorites cuando está autenticado y extrae seriesIds", async () => {
        mockFetchFavorites.mockResolvedValueOnce([
            { seriesId: 1, status: "reading" },
            { seriesId: 2, status: "completed" },
        ]);

        const { result } = renderHook(() => useFavoriteIds());

        await waitFor(() => {
            expect(result.current.favoriteIds.size).toBe(2);
        });
        expect(result.current.favoriteIds.has(1)).toBe(true);
        expect(result.current.favoriteIds.has(2)).toBe(true);
        expect(result.current.error).toBe(false);
    });

    it("no fetch si no está autenticado", () => {
        mockIsAuthenticated = false;

        const { result } = renderHook(() => useFavoriteIds());

        expect(mockFetchFavorites).not.toHaveBeenCalled();
        expect(result.current.favoriteIds.size).toBe(0);
    });

    it("setea error si fetch falla", async () => {
        mockFetchFavorites.mockRejectedValueOnce(new Error("fail"));

        const { result } = renderHook(() => useFavoriteIds());

        await waitFor(() => {
            expect(result.current.error).toBe(true);
        });
        expect(result.current.favoriteIds.size).toBe(0);
    });

    it("limpia favoriteIds al hacer logout (isAuthenticated pasa de true a false)", async () => {
        mockFetchFavorites.mockResolvedValueOnce([
            { seriesId: 1, status: "reading" },
        ]);

        const { result, rerender } = renderHook(() => useFavoriteIds());

        await waitFor(() => {
            expect(result.current.favoriteIds.size).toBe(1);
        });

        // Simular logout cambiando isAuthenticated a false
        mockIsAuthenticated = false;
        mockFetchFavorites.mockReset();
        rerender();

        await waitFor(() => {
            expect(result.current.favoriteIds.size).toBe(0);
        });
    });

    it("tolera que fetch devuelva { data } anidado", async () => {
        mockFetchFavorites.mockResolvedValueOnce({
            data: [
                { seriesId: 10, status: "reading" },
            ],
        });

        const { result } = renderHook(() => useFavoriteIds());

        await waitFor(() => {
            expect(result.current.favoriteIds.has(10)).toBe(true);
        });
    });
});
