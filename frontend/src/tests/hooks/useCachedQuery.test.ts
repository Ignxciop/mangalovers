import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { useQueryCache } from "@/store/queryCache";

describe("useCachedQuery", () => {
    const mockFetcher = vi.fn<() => Promise<string>>();

    beforeEach(() => {
        useQueryCache.getState().clear();
        mockFetcher.mockReset();
    });

    it("fetcher llamado si no hay cache", async () => {
        mockFetcher.mockResolvedValue("data-from-api");
        const { result } = renderHook(() =>
            useCachedQuery("key-1", mockFetcher),
        );

        expect(result.current.loading).toBe(true);
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.data).toBe("data-from-api");
        expect(mockFetcher).toHaveBeenCalledTimes(1);
    });

    it("usa cache si existe y no llama al fetcher", () => {
        useQueryCache.getState().set("key-cached", "cached-value");
        mockFetcher.mockResolvedValue("fresh");

        const { result } = renderHook(() =>
            useCachedQuery("key-cached", mockFetcher),
        );

        expect(result.current.data).toBe("cached-value");
        expect(result.current.loading).toBe(false);
        expect(mockFetcher).not.toHaveBeenCalled();
    });

    it("error del fetcher se captura como string", async () => {
        mockFetcher.mockRejectedValue(new Error("Network Error"));
        const { result } = renderHook(() =>
            useCachedQuery("key-error", mockFetcher),
        );

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.error).toBe("Network Error");
        expect(result.current.data).toBeUndefined();
    });

    it("error no es Error instance usa mensaje generico", async () => {
        mockFetcher.mockRejectedValue("string error");
        const { result } = renderHook(() =>
            useCachedQuery("key-err2", mockFetcher),
        );

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.error).toBe("Error al cargar datos");
    });

    it("refetch fuerza la llamada y actualiza data", async () => {
        mockFetcher.mockResolvedValue("first");
        const { result } = renderHook(() =>
            useCachedQuery("key-refetch", mockFetcher),
        );

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.data).toBe("first");

        mockFetcher.mockResolvedValue("second");
        await act(async () => {
            await result.current.refetch();
        });

        expect(result.current.data).toBe("second");
        expect(mockFetcher).toHaveBeenCalledTimes(2);
    });

    it("refetch setea error si falla", async () => {
        mockFetcher.mockResolvedValue("ok");
        const { result } = renderHook(() =>
            useCachedQuery("key-refetch-err", mockFetcher),
        );

        await waitFor(() => expect(result.current.loading).toBe(false));

        mockFetcher.mockRejectedValue(new Error("Refetch fail"));
        await act(async () => {
            await result.current.refetch();
        });

        expect(result.current.error).toBe("Refetch fail");
    });

    it("no fetch si enabled=false (loading se mantiene true si no hay cache)", () => {
        mockFetcher.mockResolvedValue("data");
        const { result } = renderHook(() =>
            useCachedQuery("key-disabled", mockFetcher, { enabled: false }),
        );

        expect(result.current.loading).toBe(true);
        expect(mockFetcher).not.toHaveBeenCalled();
    });

    it("cambiar cacheKey resetea loading cuando no hay cache", async () => {
        mockFetcher.mockResolvedValue("data");
        const { result, rerender } = renderHook(
            ({ key }) => useCachedQuery(key, mockFetcher),
            { initialProps: { key: "first" } },
        );

        await waitFor(() => expect(result.current.loading).toBe(false));

        mockFetcher.mockResolvedValue("second-data");
        rerender({ key: "second" });

        expect(result.current.loading).toBe(true);
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.data).toBe("second-data");
    });

    it("initialData se usa como fallback mientras carga", () => {
        mockFetcher.mockResolvedValue("real");
        const { result } = renderHook(() =>
            useCachedQuery("key-init", mockFetcher, { initialData: "fallback" }),
        );

        expect(result.current.data).toBe("fallback");
        expect(result.current.loading).toBe(true);
    });
});
