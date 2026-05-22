import { useEffect, useRef, useState } from "react";
import { fetchFavorites } from "@/api/manga";
import { useAuthStore } from "@/store/authStore";

export function useFavoriteIds() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
    const [error, setError] = useState(false);

    const prevAuthRef = useRef(isAuthenticated);

    useEffect(() => {
        if (!isAuthenticated) {
            if (prevAuthRef.current) {
                queueMicrotask(() => setFavoriteIds(new Set()));
            }
            prevAuthRef.current = false;
            return;
        }

        prevAuthRef.current = true;
        fetchFavorites()
            .then((res) => {
                const ids = (res.data ?? res ?? []).map(
                    (f: { seriesId: number }) => f.seriesId,
                );
                setFavoriteIds(new Set(ids));
            })
            .catch(() => setError(true));
    }, [isAuthenticated]);

    return { favoriteIds, error };
}
