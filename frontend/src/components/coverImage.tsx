import { useState, useRef, useCallback, useEffect } from "react";
import { BookOpen, RefreshCw } from "lucide-react";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1500;

interface CoverImageProps {
    src: string | null | undefined;
    alt: string;
}

export function CoverImage({ src, alt }: CoverImageProps) {
    const imgRef = useRef<HTMLImageElement>(null);
    const retryCountRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [status, setStatus] = useState<"loading" | "loaded" | "error">(
        "loading",
    );
    const loadedRef = useRef(false);

    const loadImage = useCallback((url: string) => {
        setStatus("loading");
        const img = new Image();
        img.onload = () => {
            setStatus("loaded");
            loadedRef.current = true;
            if (imgRef.current) imgRef.current.src = url;
        };
        img.onerror = () => {
            if (retryCountRef.current < MAX_RETRIES) {
                retryCountRef.current++;
                const delay = RETRY_DELAY * Math.pow(2, retryCountRef.current - 1);
                timerRef.current = setTimeout(() => loadImage(url), delay);
            } else {
                setStatus("error");
            }
        };
        img.src = url;
    }, []);

    useEffect(() => {
        if (!src) {
            setStatus("error");
            return;
        }
        retryCountRef.current = 0;
        loadedRef.current = false;
        loadImage(src);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [src, loadImage]);

    function handleRetry() {
        if (!src) return;
        retryCountRef.current = 0;
        loadImage(src);
    }

    return (
        <div className="relative w-full h-full pointer-events-none">
            {status === "loading" && (
                <div className="absolute inset-0 bg-muted animate-pulse" />
            )}

            {status === "error" && (
                <div className="absolute inset-0 bg-muted flex flex-col items-center justify-center gap-1.5">
                    <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                    {src && (
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
                src={src || ""}
                alt={alt}
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
                            if (src) loadImage(src);
                        }, delay);
                    } else if (!loadedRef.current) {
                        setStatus("error");
                    }
                }}
            />
        </div>
    );
}
