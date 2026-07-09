import { useState, useEffect } from "react";

export function useViewportGrid() {
    const [width, setWidth] = useState(window.innerWidth);

    useEffect(() => {
        const onResize = () => setWidth(window.innerWidth);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const columns =
        width < 640 ? 3
        : width < 768 ? 4
        : width < 1024 ? 6
        : width <= 1280 ? 5
        : width < 1536 ? 8
        : 8;

    const isMobile = width < 640;

    return {
        columns,
        isMobile,
        latestItems: columns * 3,
        recommendedItems: columns,
        continueItems: isMobile ? 6
            : width <= 1280 ? 3
            : 6,
    };
}
