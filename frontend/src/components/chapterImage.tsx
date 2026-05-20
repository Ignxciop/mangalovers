import { useState, useRef, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, AlertCircle } from "lucide-react";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1500;
const PRELOAD_RANGE = 6;

let preloadQueue: string[] = [];
let preloadTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePreload() {
    if (preloadTimer) clearTimeout(preloadTimer);
    preloadTimer = setTimeout(() => {
        const urls = preloadQueue.splice(0, PRELOAD_RANGE);
        urls.forEach((url) => {
            const link = document.createElement("link");
            link.rel = "preload";
            link.as = "image";
            link.href = url;
            document.head.appendChild(link);
            setTimeout(() => link.remove(), 5000);
        });
        preloadTimer = null;
    }, 300);
}

function queuePreload(url: string) {
    if (!preloadQueue.includes(url)) {
        preloadQueue.push(url);
        schedulePreload();
    }
}

interface ChapterImageProps {
    src: string;
    alt: string;
    onLoad?: () => void;
}

export function ChapterImage({ src, alt, onLoad }: ChapterImageProps) {
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<"loading" | "loaded" | "error">(
        "loading",
    );
    const retryCountRef = useRef(0);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [inView, setInView] = useState(false);
    const loadedRef = useRef(false);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "1500px" },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const loadImage = useCallback((url: string) => {
        setStatus("loading");
        const img = new Image();
        img.onload = () => {
            setStatus("loaded");
            loadedRef.current = true;
            if (imgRef.current) {
                imgRef.current.src = url;
            }
            onLoad?.();
        };
        img.onerror = () => {
            if (retryCountRef.current < MAX_RETRIES) {
                retryCountRef.current++;
                const delay = RETRY_DELAY * Math.pow(2, retryCountRef.current - 1);
                retryTimerRef.current = setTimeout(() => loadImage(url), delay);
            } else {
                setStatus("error");
            }
        };
        img.src = url;
    }, [onLoad]);

    useEffect(() => {
        if (!inView) return;

        retryCountRef.current = 0;
        loadedRef.current = false;
        loadImage(src);

        queuePreload(src);

        return () => {
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
            }
        };
    }, [src, inView, loadImage]);

    function handleRetry() {
        retryCountRef.current = 0;
        loadImage(src);
    }

    return (
        <div ref={containerRef} className="w-full relative">
            {status === "loading" && (
                <Skeleton className="w-full aspect-[3/4] rounded-none" />
            )}

            {status === "error" && (
                <div className="w-full aspect-[3/4] flex flex-col items-center justify-center gap-3 bg-accent/20 rounded-none">
                    <AlertCircle className="h-6 w-6 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                        Error al cargar
                    </p>
                    <button
                        onClick={handleRetry}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-brand text-white hover:brightness-110 transition-all active:scale-95"
                    >
                        <RefreshCw className="h-3 w-3" />
                        Reintentar
                    </button>
                </div>
            )}

            <img
                ref={imgRef}
                alt={alt}
                className={`w-full select-none block ${
                    status !== "loaded" ? "hidden" : ""
                }`}
                onLoad={() => {
                    if (!loadedRef.current) {
                        setStatus("loaded");
                        loadedRef.current = true;
                        onLoad?.();
                    }
                }}
                onError={() => {
                    if (retryCountRef.current < MAX_RETRIES && !loadedRef.current) {
                        retryCountRef.current++;
                        const delay = RETRY_DELAY * Math.pow(2, retryCountRef.current - 1);
                        setTimeout(() => loadImage(src), delay);
                    } else if (!loadedRef.current) {
                        setStatus("error");
                    }
                }}
            />
        </div>
    );
}
