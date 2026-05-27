import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/api/axios";
import { useAuthStore } from "@/store/authStore";

const POLL_INTERVAL = 10000;
const LOGOUT_DELAY = 10000;

export function useAccountStatusWatcher() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const logout = useAuthStore((s) => s.logout);
    const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const toastIdRef = useRef<string | number | null>(null);

    useEffect(() => {
        if (!isAuthenticated) return;

        const clearLogout = () => {
            if (countdownRef.current) {
                clearTimeout(countdownRef.current);
                countdownRef.current = null;
            }
            if (toastIdRef.current) {
                toast.dismiss(toastIdRef.current);
                toastIdRef.current = null;
            }
        };

        const handleStatusChange = (message: string, suspendedUntil: string | null) => {
            clearLogout();

            let description = message;
            if (suspendedUntil) {
                const d = new Date(suspendedUntil);
                const until = d.toLocaleString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
                description += ` hasta el ${until}`;
            }
            description += ". Cerrando sesión en 10 segundos...";

            toastIdRef.current = toast.error("Cuenta restringida", {
                description,
                duration: Infinity,
                position: "top-center",
            });

            countdownRef.current = setTimeout(() => {
                logout();
                window.location.href = "/acceso";
            }, LOGOUT_DELAY);
        };

        const check = async () => {
            try {
                await api.get("/auth/status");
            } catch (err: unknown) {
                const response = (err as { response?: { status?: number; data?: { message?: string } } }).response;
                if (response?.status === 403) {
                    const msg = response.data?.message || "";
                    if (msg.includes("baneada") || msg.includes("suspendida")) {
                        const suspendedUntil = msg.includes("suspendida") ? extractSuspendedUntil(msg) : null;
                        handleStatusChange(msg, suspendedUntil);
                        clearInterval(interval);
                    }
                }
            }
        };

        const interval = setInterval(check, POLL_INTERVAL);
        check();

        return () => {
            clearInterval(interval);
            clearLogout();
        };
    }, [isAuthenticated, logout]);
}

function extractSuspendedUntil(msg: string): string | null {
    const match = msg.match(/por\s+(\d+)\s*(días|día|h|min)/);
    if (!match) return null;
    const num = parseInt(match[1]);
    const unit = match[2];
    const now = new Date();
    if (unit.includes("día")) now.setDate(now.getDate() + num);
    else if (unit === "h") now.setHours(now.getHours() + num);
    else if (unit === "min") now.setMinutes(now.getMinutes() + num);
    return now.toISOString();
}
