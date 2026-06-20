import { useState, useRef, useCallback, useEffect, memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, AlertCircle } from "lucide-react";

const MAX_RETRIES = 1;
const RETRY_DELAY = 1500;
const TIMEOUT_MS = 8000;
const MIN_IMAGE_SIZE = 100;
const IO_ROOT_MARGIN = "2500px";

interface ChapterImageProps {
    src: string;
    alt: string;
    onLoad?: () => void;
    onAllRetriesFailed?: () => void;
}

function ChapterImageInner({ src, alt, onLoad, onAllRetriesFailed }: ChapterImageProps) {
    const [inView, setInView] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [errored, setErrored] = useState(false);
    const [currentSrc, setCurrentSrc] = useState<string | null>(null);
    const retryRef = useRef(0);
    const settledRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    setCurrentSrc(src);
                    observer.disconnect();
                }
            },
            { rootMargin: IO_ROOT_MARGIN },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [src]);

    const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        if (img.naturalWidth < MIN_IMAGE_SIZE || img.naturalHeight < MIN_IMAGE_SIZE) {
            if (settledRef.current) return;
            settledRef.current = true;
            setErrored(true);
            onAllRetriesFailed?.();
            return;
        }
        if (settledRef.current) return;
        settledRef.current = true;
        setLoaded(true);
        setErrored(false);
        onLoad?.();
    }, [onLoad, onAllRetriesFailed]);

    const doRetry = useCallback(() => {
        retryRef.current++;
        settledRef.current = false;
        setErrored(false);
        setLoaded(false);
        const busted = (currentSrc ?? src).includes("?")
            ? (currentSrc ?? src) + "&_retry=" + retryRef.current
            : (currentSrc ?? src) + "?_retry=" + retryRef.current;
        setCurrentSrc(busted);
    }, [currentSrc, src]);

    const handleError = useCallback(() => {
        if (settledRef.current) return;
        if (retryRef.current < MAX_RETRIES) {
            const delay = RETRY_DELAY * Math.pow(2, retryRef.current);
            timerRef.current = setTimeout(doRetry, delay);
        } else {
            settledRef.current = true;
            setErrored(true);
            onAllRetriesFailed?.();
        }
    }, [doRetry, onAllRetriesFailed]);

    useEffect(() => {
        if (!currentSrc || loaded || errored) return;
        const timeoutId = setTimeout(() => {
            if (!settledRef.current) {
                handleError();
            }
        }, TIMEOUT_MS);
        return () => clearTimeout(timeoutId);
    }, [currentSrc, loaded, errored, handleError]);

    function handleRetryButton() {
        retryRef.current = 0;
        settledRef.current = false;
        setErrored(false);
        setLoaded(false);
        setCurrentSrc(src);
    }

    if (errored) {
        return (
            <div ref={containerRef} className="w-full aspect-[3/4] flex flex-col items-center justify-center gap-3 bg-accent/20 rounded-none">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                    Error al cargar
                </p>
                <button
                    onClick={handleRetryButton}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-brand text-white hover:brightness-110 transition-all active:scale-95"
                >
                    <RefreshCw className="h-3 w-3" />
                    Reintentar
                </button>
            </div>
        );
    }

    if (!inView) {
        return (
            <div ref={containerRef} className="w-full">
                <Skeleton className="w-full aspect-[3/4] rounded-none" />
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full relative">
            {!loaded && (
                <Skeleton className="w-full aspect-[3/4] rounded-none" />
            )}
            <img
                src={currentSrc!}
                alt={alt}
                className="w-full select-none block"
                style={{ visibility: loaded ? "visible" : "hidden" }}
                onLoad={handleLoad}
                onError={handleError}
            />
        </div>
    );
}

export const ChapterImage = memo(function ChapterImage(props: ChapterImageProps) {
    return <ChapterImageInner key={props.src} {...props} />;
});
