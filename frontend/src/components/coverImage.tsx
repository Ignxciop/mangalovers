import { useState, useRef, useCallback, useEffect } from "react";
import { BookOpen, RefreshCw } from "lucide-react";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1500;

interface CoverImageProps {
    src: string | null | undefined;
    alt: string;
    priority?: boolean;
    fallbackSrc?: string | null;
}

export function CoverImage({ src, alt, priority = false, fallbackSrc }: CoverImageProps) {
    const divRef = useRef<HTMLDivElement>(null);
    const retryCountRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loadedRef = useRef(false);
    const [status, setStatus] = useState<"loading" | "loaded" | "error">(
        src ? "loading" : "error",
    );
    const [useFallback, setUseFallback] = useState(false);
    const prevSrc = useRef(src);

    if (src !== prevSrc.current) {
        prevSrc.current = src;
        if (useFallback) setUseFallback(false);
    }

    const effectiveSrc =
        useFallback && fallbackSrc ? fallbackSrc : src ?? "";

    const loadImage = useCallback((url: string) => {
        setStatus("loading");
        const img = new Image();
        img.onload = () => {
            setStatus("loaded");
            loadedRef.current = true;
        };
        img.onerror = () => {
            if (retryCountRef.current < MAX_RETRIES) {
                retryCountRef.current++;
                const delay = RETRY_DELAY * Math.pow(2, retryCountRef.current - 1);
                timerRef.current = setTimeout(() => loadImageRef.current?.(url), delay);
            } else if (fallbackSrc && !useFallback) {
                retryCountRef.current = 0;
                setUseFallback(true);
                timerRef.current = setTimeout(() => loadImage(fallbackSrc), 100);
            } else {
                setStatus("error");
            }
        };
        img.src = url;
    }, [fallbackSrc, useFallback]);

    const loadImageRef = useRef<((url: string) => void) | null>(null);
    loadImageRef.current = loadImage;

    useEffect(() => {
        if (!src) {
            setStatus("error");
            return;
        }

        retryCountRef.current = 0;
        loadedRef.current = false;

        if (priority) {
            queueMicrotask(() => loadImage(src));
            return;
        }

        const el = divRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    retryCountRef.current = 0;
                    loadedRef.current = false;
                    loadImage(src);
                    observer.disconnect();
                }
            },
            { rootMargin: "200px" },
        );

        observer.observe(el);

        return () => {
            observer.disconnect();
            if (timerRef.current) clearTimeout(timerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src, useFallback]);

    function handleRetry() {
        if (!src && !fallbackSrc) return;
        retryCountRef.current = 0;
        setUseFallback(false);
        loadImage(src ?? fallbackSrc ?? "");
    }

    return (
        <div ref={divRef} className="relative w-full h-full pointer-events-none">
            {status === "loading" && (
                <div className="absolute inset-0 bg-muted animate-pulse" />
            )}

            {status === "error" && (
                <div className="absolute inset-0 bg-muted flex flex-col items-center justify-center gap-1.5">
                    <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                    {effectiveSrc && (
                        <button
                            onClick={handleRetry}
                            className="pointer-events-auto flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-brand/20 text-brand hover:bg-brand/30 transition-colors active:scale-95"
                        >
                            <RefreshCw className="h-2.5 w-2.5" />
                            Reintentar
                        </button>
                    )}
                </div>
            )}

            <img
                src={effectiveSrc}
                alt={alt}
                loading={priority ? "eager" : "lazy"}
                {...(priority ? { fetchPriority: "high" } : {})}
                className={`w-full h-full object-cover ${
                    status === "loaded" ? "opacity-100" : "opacity-0"
                } transition-opacity duration-300`}
                onLoad={() => {
                    if (!loadedRef.current) {
                        setStatus("loaded");
                        loadedRef.current = true;
                    }
                }}
                onError={() => {
                    if (retryCountRef.current < MAX_RETRIES && !loadedRef.current) {
                        retryCountRef.current++;
                        const delay = RETRY_DELAY * Math.pow(2, retryCountRef.current - 1);
                        timerRef.current = setTimeout(() => {
                            loadImageRef.current?.(effectiveSrc);
                        }, delay);
                    } else if (fallbackSrc && !useFallback && !loadedRef.current) {
                        retryCountRef.current = 0;
                        setUseFallback(true);
                        setStatus("loading");
                    } else if (!loadedRef.current) {
                        setStatus("error");
                    }
                }}
            />
        </div>
    );
}
