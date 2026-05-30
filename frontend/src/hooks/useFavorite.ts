import { useEffect, useState, useRef } from "react";
import { fetchFavorite, upsertFavorite, deleteFavorite } from "@/api/manga";
import { useAuthStore } from "@/store/authStore";
import { useQueryCache } from "@/store/queryCache";
import { toast } from "sonner";

export function useFavorite(seriesId: number) {
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const invalidate = useQueryCache((s) => s.invalidate);
    const statusRef = useRef(status);
    statusRef.current = status;

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
        const prev = statusRef.current;
        setStatus(newStatus);
        try {
            await upsertFavorite(seriesId, newStatus);
            invalidate("manga-list");
        } catch {
            setStatus(prev);
            toast.error("No se pudo guardar el favorito");
        }
    }

    async function remove() {
        if (!isAuthenticated) return;
        const prev = statusRef.current;
        setStatus(null);
        try {
            await deleteFavorite(seriesId);
            invalidate("manga-list");
        } catch {
            setStatus(prev);
            toast.error("No se pudo eliminar el favorito");
        }
    }

    return { status, loading, save, remove };
}
