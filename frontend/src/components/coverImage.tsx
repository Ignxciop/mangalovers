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
    const imgRef = useRef<HTMLImageElement>(null);
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

    const currentUrl = useFallback && fallbackSrc ? fallbackSrc : src ?? "";

    const startLoad = useCallback((url: string) => {
        if (loadedRef.current) return;
        setStatus("loading");
        const img = new Image();
        img.onload = () => {
            if (loadedRef.current) return;
            setStatus("loaded");
            loadedRef.current = true;
            if (imgRef.current) imgRef.current.src = url;
        };
        img.onerror = () => {
            if (loadedRef.current) return;
            if (retryCountRef.current < MAX_RETRIES) {
                retryCountRef.current++;
                const delay = RETRY_DELAY * Math.pow(2, retryCountRef.current - 1);
                timerRef.current = setTimeout(() => loadRef.current?.(url), delay);
            } else if (fallbackSrc && url !== fallbackSrc) {
                retryCountRef.current = 0;
                setUseFallback(true);
            } else {
                setStatus("error");
            }
        };
        img.src = url;
    }, [fallbackSrc]);

    const loadRef = useRef<((url: string) => void) | null>(null);
    loadRef.current = startLoad;

    useEffect(() => {
        if (!src) {
            setStatus("error");
            return;
        }

        retryCountRef.current = 0;
        loadedRef.current = false;

        if (priority) {
            queueMicrotask(() => startLoad(currentUrl));
            return;
        }

        const el = divRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    startLoad(currentUrl);
                    observer.disconnect();
                }
            },
            { rootMargin: "200px" },
        );

        observer.observe(el);

        return () => {
            observer.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src, useFallback]);

    function handleRetry() {
        if (!src && !fallbackSrc) return;
        retryCountRef.current = 0;
        loadedRef.current = false;
        setUseFallback(false);
        const url = src ?? fallbackSrc ?? "";
        queueMicrotask(() => startLoad(url));
    }

    return (
        <div ref={divRef} className="relative w-full h-full pointer-events-none">
            {status === "loading" && (
                <div className="absolute inset-0 bg-muted animate-pulse" />
            )}

            {status === "error" && (
                <div className="absolute inset-0 bg-muted flex flex-col items-center justify-center gap-1.5">
                    <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                    {currentUrl && (
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
                ref={imgRef}
                src={currentUrl}
                alt={alt}
                loading={priority ? "eager" : "lazy"}
                {...(priority ? { fetchPriority: "high" } : {})}
                className={`w-full h-full object-cover ${
                    status === "loaded" ? "opacity-100" : "opacity-0"
                } transition-opacity duration-300`}
                onLoad={() => {
                    if (loadedRef.current) return;
                    setStatus("loaded");
                    loadedRef.current = true;
                }}
                onError={() => {
                    if (loadedRef.current) return;
                    if (retryCountRef.current < MAX_RETRIES) {
                        retryCountRef.current++;
                        const delay = RETRY_DELAY * Math.pow(2, retryCountRef.current - 1);
                        timerRef.current = setTimeout(() => {
                            loadRef.current?.(currentUrl);
                        }, delay);
                    } else if (fallbackSrc && currentUrl !== fallbackSrc) {
                        retryCountRef.current = 0;
                        setUseFallback(true);
                        setStatus("loading");
                    } else {
                        setStatus("error");
                    }
                }}
            />
        </div>
    );
}
