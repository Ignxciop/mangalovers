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
        : width < 1280 ? 8
        : width < 1536 ? 10
        : width < 1920 ? 12
        : width < 2560 ? 16
        : 20;

    const isMobile = width < 640;

    return {
        columns,
        isMobile,
        latestItems: columns * 3,
        recommendedItems: columns,
        continueItems: isMobile ? 6 :
            width >= 1536 ? 8 :
            width >= 1280 ? 7 :
            width >= 1024 ? 6 :
            width >= 768 ? 5 :
            4,
    };
}
