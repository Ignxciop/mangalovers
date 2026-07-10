import { useState, useEffect, useCallback, type RefObject } from "react";

export function useGridColumnCount(
    ref: RefObject<HTMLDivElement | null>,
    fallback: number,
): number {
    const [columns, setColumns] = useState(fallback);

    const update = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        const style = getComputedStyle(el);
        const template = style.gridTemplateColumns;
        const count = template.split(/\s+/).filter(Boolean).length;
        if (count > 0) setColumns(count);
    }, [ref]);

    useEffect(() => {
        update();
        const el = ref.current;
        if (!el) return;
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, [update]);

    return columns;
}
