import { useEffect, useState } from "react";
import { fetchFavorite, upsertFavorite, deleteFavorite } from "@/api/manga";
import { useAuthStore } from "@/store/authStore";
import { useQueryCache } from "@/store/queryCache";

export function useFavorite(seriesId: number) {
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const invalidate = useQueryCache((s) => s.invalidate);

    useEffect(() => {
        if (!seriesId || !isAuthenticated) return;

        async function load() {
            setLoading(true);
            try {
                const f = await fetchFavorite(seriesId);
                setStatus(f?.status ?? null);
            } catch {
                setStatus(null);
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [seriesId, isAuthenticated]);

    async function save(newStatus: string) {
        if (!isAuthenticated) return;
        const result = await upsertFavorite(seriesId, newStatus);
        setStatus(result.status);
        invalidate("manga-list");
    }

    async function remove() {
        if (!isAuthenticated) return;
        await deleteFavorite(seriesId);
        setStatus(null);
        invalidate("manga-list");
    }

    return { status, loading, save, remove };
}
