import { Loader2 } from "lucide-react";

export function PullToRefresh({
    pull,
    refreshing,
}: {
    pull: number;
    refreshing: boolean;
}) {
    return (
        <div
            className="fixed top-0 left-0 w-full flex justify-center z-50 pointer-events-none transition-all"
            style={{
                transform: `translateY(${pull}px)`,
                opacity: pull > 10 ? 1 : 0,
            }}
            role="status"
            aria-live="polite"
            aria-label={refreshing ? "Recargando contenido" : "Desliza para recargar"}
        >
            <div className="mt-2 flex items-center gap-2 bg-background/90 backdrop-blur px-3 py-1.5 rounded-full border border-border shadow">
                <Loader2
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                    aria-hidden="true"
                />
                <span className="text-xs text-muted-foreground">
                    {refreshing ? "Recargando…" : "Desliza para recargar"}
                </span>
            </div>
        </div>
    );
}
