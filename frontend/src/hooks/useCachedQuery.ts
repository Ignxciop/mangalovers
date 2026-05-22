import { useEffect, useState, useCallback } from "react";
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
  const initialCached = get<T>(cacheKey);
  const [data, setData] = useState<T>(initialCached ?? options?.initialData as T);
  const [loading, setLoading] = useState(!initialCached);
  const [error, setError] = useState<string | null>(null);
  const enabled = options?.enabled ?? true;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      set(cacheKey, result, options?.ttl);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetcher, options?.ttl, set]);

  useEffect(() => {
    if (!enabled) return;

    if (initialCached) return;

    const abort = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetcher(abort.signal);
        if (!abort.signal.aborted) {
          set(cacheKey, result, options?.ttl);
          setData(result);
        }
      } catch (err) {
        if (!abort.signal.aborted) {
          setError(err instanceof Error ? err.message : "Error al cargar datos");
        }
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    }

    load();

    return () => abort.abort();
  }, [cacheKey, enabled, options?.ttl, set, fetcher]);

  return { data, loading, error, refetch };
}
