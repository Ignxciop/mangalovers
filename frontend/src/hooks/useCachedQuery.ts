import { useEffect, useState, useCallback, useRef } from "react";
import { useQueryCache } from "@/store/queryCache";

interface UseCachedQueryResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCachedQuery<T>(
  cacheKey: string,
  fetcher: (signal?: AbortSignal) => Promise<T>,
  options?: { ttl?: number; enabled?: boolean; initialData?: T },
): UseCachedQueryResult<T> {
  const get = useQueryCache((s) => s.get);
  const set = useQueryCache((s) => s.set);
  const enabled = options?.enabled ?? true;

  const [data, setData] = useState<T>(() => get<T>(cacheKey) ?? options?.initialData as T);
  const [loading, setLoading] = useState(() => !get<T>(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Sync data/loading from cache when cacheKey changes (avoids stale data from a previous key)
  useEffect(() => {
    const cached = get<T>(cacheKey);
    if (cached !== undefined) {
      setData(cached);
      setLoading(false);
    } else {
      setData(options?.initialData as T);
      setLoading(true);
    }
    setError(null);
  }, [cacheKey, get, options?.initialData]);

  // Fetch when cacheKey has no cached data
  useEffect(() => {
    if (!enabled) return;
    if (get<T>(cacheKey) !== undefined) return;

    const abort = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetcherRef.current(abort.signal);
        if (!abort.signal.aborted) {
          set(cacheKey, result, options?.ttl);
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (abort.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Error al cargar datos");
        setLoading(false);
      }
    }

    load();

    return () => abort.abort();
  }, [cacheKey, enabled, options?.ttl, get, set]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetcherRef.current();
      set(cacheKey, result, options?.ttl);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [cacheKey, options?.ttl, set]);

  return { data, loading, error, refetch };
}
