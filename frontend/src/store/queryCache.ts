import { create } from "zustand";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface QueryCacheState {
  cache: Record<string, CacheEntry<unknown>>;
  get: <T>(key: string) => T | undefined;
  set: <T>(key: string, data: T, ttlMs?: number) => void;
  invalidate: (keyPrefix: string) => void;
  clear: () => void;
}

const DEFAULT_TTL = 60_000;

export const useQueryCache = create<QueryCacheState>((set, get) => ({
  cache: {},

  get: <T>(key: string): T | undefined => {
    const entry = get().cache[key] as CacheEntry<T> | undefined;
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      set((s) => {
        const next = { ...s.cache };
        delete next[key];
        return { cache: next };
      });
      return undefined;
    }
    return entry.data;
  },

  set: <T>(key: string, data: T, ttlMs = DEFAULT_TTL) => {
    set((s) => ({
      cache: {
        ...s.cache,
        [key]: { data, expiresAt: Date.now() + ttlMs },
      },
    }));
  },

  invalidate: (keyPrefix: string) => {
    set((s) => {
      const next = { ...s.cache };
      for (const key of Object.keys(next)) {
        if (key.startsWith(keyPrefix)) delete next[key];
      }
      return { cache: next };
    });
  },

  clear: () => set({ cache: {} }),
}));
