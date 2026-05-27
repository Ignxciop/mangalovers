import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useQueryCache } from "@/store/queryCache";

describe("useQueryCache", () => {
    beforeEach(() => {
        useQueryCache.getState().clear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("inicia con cache vacío", () => {
        expect(useQueryCache.getState().cache).toEqual({});
    });

    it("set y get con TTL default (60s)", () => {
        const store = useQueryCache.getState();
        store.set("key1", { foo: "bar" });
        expect(store.get("key1")).toEqual({ foo: "bar" });
    });

    it("get devuelve undefined para key inexistente", () => {
        const result = useQueryCache.getState().get("nonexistent");
        expect(result).toBeUndefined();
    });

    it("get devuelve undefined si expiró", () => {
        const store = useQueryCache.getState();
        store.set("key1", "data", 1000);
        vi.advanceTimersByTime(1001);
        expect(store.get("key1")).toBeUndefined();
    });

    it("get elimina la entrada expirada del cache", () => {
        const store = useQueryCache.getState();
        store.set("expirable", "val", 500);
        vi.advanceTimersByTime(501);
        store.get("expirable");
        expect(store.cache["expirable"]).toBeUndefined();
    });

    it("invalidate elimina keys por prefijo", () => {
        const store = useQueryCache.getState();
        store.set("manga-1", "a");
        store.set("manga-2", "b");
        store.set("series-1", "c");
        store.invalidate("manga-");
        expect(store.get("manga-1")).toBeUndefined();
        expect(store.get("manga-2")).toBeUndefined();
        expect(store.get("series-1")).toBe("c");
    });

    it("invalidate con prefijo que no existe no rompe", () => {
        const store = useQueryCache.getState();
        store.set("a", 1);
        store.invalidate("z-");
        expect(store.get("a")).toBe(1);
    });

    it("clear elimina todo", () => {
        const store = useQueryCache.getState();
        store.set("a", 1);
        store.set("b", 2);
        store.clear();
        expect(store.get("a")).toBeUndefined();
        expect(store.get("b")).toBeUndefined();
    });

    it("set con TTL personalizado", () => {
        const store = useQueryCache.getState();
        store.set("short", "x", 100);
        store.set("long", "y", 5000);
        vi.advanceTimersByTime(200);
        expect(store.get("short")).toBeUndefined();
        expect(store.get("long")).toBe("y");
    });
});
