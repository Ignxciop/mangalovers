import { useState, useRef, useCallback, useEffect, memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, AlertCircle } from "lucide-react";

const MAX_RETRIES = 1;
const RETRY_DELAY = 1500;
const TIMEOUT_MS = 10000;

interface ChapterImageProps {
    src: string;
    alt: string;
    onLoad?: () => void;
    onAllRetriesFailed?: () => void;
}

function ChapterImageInner({ src, alt, onLoad, onAllRetriesFailed }: ChapterImageProps) {
    const [loaded, setLoaded] = useState(false);
    const [errored, setErrored] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(src);
    const retryRef = useRef(0);
    const settledRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleLoad = useCallback(() => {
        if (settledRef.current) return;
        settledRef.current = true;
        setLoaded(true);
        setErrored(false);
        onLoad?.();
    }, [onLoad]);

    const doRetry = useCallback(() => {
        retryRef.current++;
        settledRef.current = false;
        setErrored(false);
        setLoaded(false);
        const busted = currentSrc.includes("?")
            ? currentSrc + "&_retry=" + retryRef.current
            : currentSrc + "?_retry=" + retryRef.current;
        setCurrentSrc(busted);
    }, [currentSrc]);

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
        if (loaded || errored) return;
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
            <div className="w-full aspect-[3/4] flex flex-col items-center justify-center gap-3 bg-accent/20 rounded-none">
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

    return (
        <div className="w-full relative">
            {!loaded && (
                <Skeleton className="w-full aspect-[3/4] rounded-none" />
            )}
            <img
                src={currentSrc}
                alt={alt}
                loading="lazy"
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
