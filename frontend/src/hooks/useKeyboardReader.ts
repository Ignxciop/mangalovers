import { useEffect, useRef } from "react";

interface KeyboardActions {
    onPrevPage: () => void;
    onNextPage: () => void;
    onToggleMode: () => void;
    onToggleFullscreen: () => void;
    onOpenChapterSelector: () => void;
    onEscape: () => void;
}

export function useKeyboardReader(actions: KeyboardActions, enabled: boolean) {
    const ref = useRef(actions);

    useEffect(() => {
        ref.current = actions;
    });

    useEffect(() => {
        if (!enabled) return;

        function handleKeyDown(e: KeyboardEvent) {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

            const a = ref.current;

            switch (e.key) {
                case "ArrowLeft":
                    e.preventDefault();
                    a.onPrevPage();
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    a.onNextPage();
                    break;
                case " ":
                    e.preventDefault();
                    a.onNextPage();
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    a.onNextPage();
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    a.onPrevPage();
                    break;
                case "m":
                case "c":
                    e.preventDefault();
                    a.onToggleMode();
                    break;
                case "f":
                    e.preventDefault();
                    a.onToggleFullscreen();
                    break;
                case "g":
                    e.preventDefault();
                    a.onOpenChapterSelector();
                    break;
                case "Escape":
                    e.preventDefault();
                    a.onEscape();
                    break;
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [enabled]);
}
