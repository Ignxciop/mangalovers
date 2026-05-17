import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMangaList } from "@/api/manga";
import type { Manga } from "@/types/manga";
import { Input } from "@/components/ui/input";
import { Search, X, BookOpen } from "lucide-react";

export function SearchBar() {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Manga[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const handler = (e: TouchEvent) => e.stopPropagation();
        el.addEventListener("touchstart", handler, { passive: true });
        el.addEventListener("touchmove", handler, { passive: true });
        el.addEventListener("touchend", handler);
        return () => {
            el.removeEventListener("touchstart", handler);
            el.removeEventListener("touchmove", handler);
            el.removeEventListener("touchend", handler);
        };
    }, []);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetchMangaList({ search: query.trim(), limit: 8, sort: "az" });
                setResults(res.data);
                setOpen(true);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const select = useCallback(
        (slug: string) => {
            setOpen(false);
            setQuery("");
            navigate(`/manga/${slug}`);
        },
        [navigate],
    );

    const resultsId = "search-results";
    const listboxId = "search-listbox";

    return (
        <div ref={ref} className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Input
                ref={inputRef}
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-label="Buscar series"
                placeholder="Buscar series..."
                className="pl-9 pr-9 w-full bg-secondary/50"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => results.length > 0 && setOpen(true)}
            />
            {query && (
                <button
                    onClick={() => {
                        setQuery("");
                        setResults([]);
                        setOpen(false);
                        inputRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Limpiar búsqueda"
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>
            )}
            <div
                id={resultsId}
                role="region"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
            >
                {open && !loading
                    ? `${results.length} resultado${results.length !== 1 ? "s" : ""}`
                    : ""}
            </div>
            {open && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden">
                    {loading ? (
                        <div className="p-3 text-xs text-muted-foreground text-center" role="status">
                            Buscando...
                        </div>
                    ) : results.length === 0 ? (
                        <div className="p-3 text-xs text-muted-foreground text-center" role="status">
                            Sin resultados
                        </div>
                    ) : (
                        <ul id={listboxId} role="listbox" className="max-h-72 overflow-y-auto overscroll-behavior-contain">
                            {results.map((m) => (
                                <li key={m.id} role="option" aria-selected={false}>
                                    <button
                                        onClick={() => select(m.slug)}
                                        className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-muted transition-colors"
                                    >
                                        <div className="size-8 rounded overflow-hidden bg-muted shrink-0">
                                            {m.cover ? (
                                                <img
                                                    src={m.cover}
                                                    alt=""
                                                    width={32}
                                                    height={32}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground/40" aria-hidden="true" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium truncate">
                                                {m.name}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {m.type ?? "Serie"}
                                            </p>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
