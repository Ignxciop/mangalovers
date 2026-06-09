import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./styles/global.css";
import { registerServiceWorker } from "./lib/registerServiceWorker";
import { useAuthStore } from "@/store/authStore";
import { connectSocket, disconnectSocket } from "@/api/socket";

void registerServiceWorker();

function SocketManager({ children }: { children: React.ReactNode }) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    useEffect(() => {
        if (isAuthenticated && accessToken) {
            connectSocket(accessToken);
        } else {
            disconnectSocket();
        }
        return () => disconnectSocket();
    }, [isAuthenticated, accessToken]);

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
