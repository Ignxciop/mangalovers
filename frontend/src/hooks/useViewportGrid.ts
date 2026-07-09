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
        : width <= 1280 ? 6
        : width < 1536 ? 8
        : width < 1880 ? 10
        : width < 2520 ? 10
        : width < 3400 ? 12
        : 14;

    const isMobile = width < 640;

    return {
        columns,
        isMobile,
        latestItems: columns * 3,
        recommendedItems: columns,
        continueItems: isMobile ? 6 :
            width >= 3400 ? 14 :
            width >= 2520 ? 10 :
            width >= 1880 ? 7 :
            width >= 1536 ? 8 :
            width >= 1280 ? 6 :
            width >= 1024 ? 6 :
            width >= 768 ? 5 :
            4,
    };
}
