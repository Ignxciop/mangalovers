import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const mockFetchFavorite = vi.fn();
const mockUpsertFavorite = vi.fn();
const mockDeleteFavorite = vi.fn();

vi.mock("@/api/manga", () => ({
    fetchFavorite: (...args: unknown[]) => mockFetchFavorite(...args),
    upsertFavorite: (...args: unknown[]) => mockUpsertFavorite(...args),
    deleteFavorite: (...args: unknown[]) => mockDeleteFavorite(...args),
}));

const mockInvalidate = vi.fn();

vi.mock("@/store/queryCache", () => ({
    useQueryCache: vi.fn((selector?: (s: Record<string, unknown>) => unknown) => {
        const state = { invalidate: mockInvalidate } as Record<string, unknown>;
        return selector ? selector(state) : state;
    }),
}));

let mockIsAuthenticated = true;

vi.mock("@/store/authStore", () => ({
    useAuthStore: vi.fn((selector?: (s: Record<string, unknown>) => unknown) => {
        const state = { isAuthenticated: mockIsAuthenticated } as Record<string, unknown>;
        return selector ? selector(state) : state;
    }),
}));

import { useFavorite } from "@/hooks/useFavorite";

const SERIES_ID = 42;

describe("useFavorite", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsAuthenticated = true;
    });

    it("carga el estado del favorito al montar", async () => {
        mockFetchFavorite.mockResolvedValueOnce({ status: "reading" });

        const { result } = renderHook(() => useFavorite(SERIES_ID));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.status).toBe("reading");
        expect(mockFetchFavorite).toHaveBeenCalledWith(SERIES_ID);
    });

    it("status es null si no hay favorito", async () => {
        mockFetchFavorite.mockResolvedValueOnce(null);

        const { result } = renderHook(() => useFavorite(SERIES_ID));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.status).toBeNull();
    });

    it("status es null si fetch falla", async () => {
        mockFetchFavorite.mockRejectedValueOnce(new Error("fail"));

        const { result } = renderHook(() => useFavorite(SERIES_ID));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.status).toBeNull();
    });

    it("no fetch si no está autenticado", () => {
        mockIsAuthenticated = false;

        renderHook(() => useFavorite(SERIES_ID));

        expect(mockFetchFavorite).not.toHaveBeenCalled();
    });

    describe("save", () => {
        it("llama upsertFavorite con el status", async () => {
            mockFetchFavorite.mockResolvedValueOnce({ status: "reading" });
            mockUpsertFavorite.mockResolvedValueOnce({ status: "completed" });

            const { result } = renderHook(() => useFavorite(SERIES_ID));
            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.save("completed");
            });

            expect(mockUpsertFavorite).toHaveBeenCalledWith(SERIES_ID, "completed");
            expect(result.current.status).toBe("completed");
            expect(mockInvalidate).toHaveBeenCalledWith("manga-list");
        });

        it("no hace nada si no está autenticado", async () => {
            mockIsAuthenticated = false;
            mockFetchFavorite.mockResolvedValueOnce(null);

            const { result } = renderHook(() => useFavorite(SERIES_ID));
            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.save("reading");
            });

            expect(mockUpsertFavorite).not.toHaveBeenCalled();
        });
    });

    describe("remove", () => {
        it("llama deleteFavorite y resetea status", async () => {
            mockFetchFavorite.mockResolvedValueOnce({ status: "reading" });
            mockDeleteFavorite.mockResolvedValueOnce(undefined);

            const { result } = renderHook(() => useFavorite(SERIES_ID));
            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.remove();
            });

            expect(mockDeleteFavorite).toHaveBeenCalledWith(SERIES_ID);
            expect(result.current.status).toBeNull();
            expect(mockInvalidate).toHaveBeenCalledWith("manga-list");
        });

        it("no hace nada si no está autenticado", async () => {
            mockIsAuthenticated = false;
            mockFetchFavorite.mockResolvedValueOnce(null);

            const { result } = renderHook(() => useFavorite(SERIES_ID));
            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.remove();
            });

            expect(mockDeleteFavorite).not.toHaveBeenCalled();
        });
    });
});
