import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./styles/global.css";
import { registerServiceWorker } from "./lib/registerServiceWorker";
import { useAuthStore } from "@/store/authStore";
import { connectSocket, disconnectSocket } from "@/api/socket";
import { useSocketNotifications } from "@/hooks/useSocketNotifications";
import { usePresence } from "@/hooks/usePresence";

void registerServiceWorker();

export function SocketManager({ children }: { children: React.ReactNode }) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const hasPrerendering = "prerendering" in document && (document as unknown as { prerendering: boolean }).prerendering;
    const [pageReady, setPageReady] = useState(!hasPrerendering);

    useEffect(() => {
        if (!hasPrerendering) return;
        const onActivate = () => setPageReady(true);
        document.addEventListener("prerenderingchange", onActivate);
        return () => document.removeEventListener("prerenderingchange", onActivate);
    }, []);

    useEffect(() => {
        if (isAuthenticated && accessToken && pageReady) {
            connectSocket(accessToken);
        } else {
            disconnectSocket();
        }
        return () => disconnectSocket();
    }, [isAuthenticated, accessToken, pageReady]);

    useSocketNotifications();
    usePresence();

    return <>{children}</>;
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <HelmetProvider>
            <SocketManager>
                <App />
            </SocketManager>
        </HelmetProvider>
    </StrictMode>,
);
