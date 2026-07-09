import { useState } from "react";
import { Outlet, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { PageTransition } from "@/components/page-transition";
import { HeaderProvider, useHeader } from "@/context/headerContext";
import { SearchBar } from "@/components/search-bar";
import { ArrowLeft, BookHeart } from "lucide-react";

function getSidebarInitialState(): boolean {
    if (typeof document === "undefined") return true;
    const match = document.cookie.match(/(^| )sidebar_state=([^;]+)/);
    return match ? match[2] === "true" : true;
}

function GlobalHeader() {
    const { content, hidden, searchMode, setSearchMode } = useHeader();
    const { isMobile } = useSidebar();

    if (hidden) return null;

    if (isMobile && searchMode) {
        return (
            <div className="flex items-center h-16 px-2 gap-2">
                <button
                    onClick={() => setSearchMode(false)}
                    className="shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
                    aria-label="Cerrar búsqueda"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex-1 min-w-0">
                    <SearchBar />
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-[auto_1fr_auto] items-center h-16 px-4 gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
                <SidebarTrigger />
                <Link to="/" className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-brand to-brand-cyan text-white shrink-0 shadow-sm">
                        <BookHeart className="size-4" />
                    </div>
                    <span className="font-extrabold text-[18px] tracking-tight hidden sm:inline">Mangalovers</span>
                </Link>
                {content.left}
            </div>
            <div className="flex justify-center min-w-0">
                {content.center}
            </div>
            <div className="flex items-center gap-2">
                {content.right}
            </div>
        </div>
    );
}

export default function MainLayout() {
    const [defaultOpen] = useState(getSidebarInitialState);

    return (
        <HeaderProvider>
            <SidebarProvider defaultOpen={defaultOpen} className="flex-col">
                <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border shadow-[0_1px_0_0] shadow-brand/5">
                    <GlobalHeader />
                </header>
                <div className="flex flex-1">
                    <AppSidebar />
                    <div
                        id="main-content"
                        className="w-full"
                        style={{ padding: "env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)" }}
                    >
                        <PageTransition>
                            <Outlet />
                        </PageTransition>
                    </div>
                </div>
            </SidebarProvider>
        </HeaderProvider>
    );
}
