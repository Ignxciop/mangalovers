import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
    const location = useLocation();

    return (
        <div
            key={location.pathname}
            className="animate-fade-in-up motion-safe:animate-fade-in-up motion-reduce:animate-none"
        >
            {children}
        </div>
    );
}
