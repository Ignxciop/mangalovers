import { useEffect, useRef, useState } from "react";

export function usePullToRefresh(onRefresh: () => void) {
    const [pull, setPull] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const pullRef = useRef(0);
    const onRefreshRef = useRef(onRefresh);

    useEffect(() => {
        onRefreshRef.current = onRefresh;
    });

    const startY = useRef(0);
    const pulling = useRef(false);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            if (window.scrollY === 0) {
                startY.current = e.touches[0].clientY;
                pulling.current = true;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!pulling.current) return;

            const currentY = e.touches[0].clientY;
            const diff = currentY - startY.current;

            if (diff > 0) {
                e.preventDefault();
                const next = Math.min(diff, 120);
                pullRef.current = next;
                setPull(next);
            }
        };

        const handleTouchEnd = () => {
            if (!pulling.current) return;

            if (pullRef.current > 80) {
                setRefreshing(true);

                setTimeout(() => {
                    onRefreshRef.current();
                    setRefreshing(false);
                    setPull(0);
                    pullRef.current = 0;
                }, 600);
            } else {
                setPull(0);
                pullRef.current = 0;
            }

            pulling.current = false;
        };

        window.addEventListener("touchstart", handleTouchStart, {
            passive: true,
        });
        window.addEventListener("touchmove", handleTouchMove, {
            passive: false,
        });
        window.addEventListener("touchend", handleTouchEnd);

        return () => {
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
        };
    }, []);

    return { pull, refreshing };
}
