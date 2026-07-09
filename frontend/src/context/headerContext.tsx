/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from "react";

interface HeaderContent {
    left?: ReactNode;
    center?: ReactNode;
    right?: ReactNode;
}

interface HeaderContextValue {
    content: HeaderContent;
    setContent: (content: HeaderContent) => void;
    hidden: boolean;
    setHidden: (hidden: boolean) => void;
    searchMode: boolean;
    setSearchMode: (mode: boolean) => void;
}

const HeaderContext = createContext<HeaderContextValue | null>(null);

export function HeaderProvider({ children }: { children: ReactNode }) {
    const [content, setContent] = useState<HeaderContent>({});
    const [hidden, setHidden] = useState(false);
    const [searchMode, setSearchMode] = useState(false);

    return (
        <HeaderContext.Provider value={{ content, setContent, hidden, setHidden, searchMode, setSearchMode }}>
            {children}
        </HeaderContext.Provider>
    );
}

export function useHeader() {
    const ctx = useContext(HeaderContext);
    if (!ctx) throw new Error("useHeader must be used within HeaderProvider");
    return ctx;
}
