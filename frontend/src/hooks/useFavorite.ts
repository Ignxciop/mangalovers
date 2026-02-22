import { useEffect, useState } from "react";
import { fetchFavorite, upsertFavorite, deleteFavorite } from "@/api/manga";

export function useFavorite(seriesId: number) {
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!seriesId) return;
        fetchFavorite(seriesId)
            .then((f) => setStatus(f?.status ?? null))
            .catch(() => setStatus(null))
            .finally(() => setLoading(false));
    }, [seriesId]);

    async function save(newStatus: string) {
        const result = await upsertFavorite(seriesId, newStatus);
        setStatus(result.status);
    }

    async function remove() {
        await deleteFavorite(seriesId);
        setStatus(null);
    }

    return { status, loading, save, remove };
}
