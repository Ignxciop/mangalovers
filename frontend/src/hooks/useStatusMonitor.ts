import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getMyStatus } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";

const POLL_INTERVAL = 15000;
const LOGOUT_DELAY = 10000;

export function useStatusMonitor() {
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const toastIdRef = useRef<string | number | null>(null);
    const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingRef = useRef(false);

    useEffect(() => {
        if (!isAuthenticated) return;

        let cancelled = false;

        const forceLogout = () => {
            if (cancelled) return;
            toastIdRef.current = null;
            pendingRef.current = false;
            useAuthStore.getState().logout();
            navigate("/login");
        };

        const startLogoutCountdown = () => {
            if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
            logoutTimerRef.current = setTimeout(forceLogout, LOGOUT_DELAY);
        };

        const poll = async () => {
            try {
                const data = await getMyStatus();
                if (cancelled) return;
                if (pendingRef.current) return;

                const prevStatus = useAuthStore.getState().user?.status;
                if (data.status === prevStatus) return;

                pendingRef.current = true;
                useAuthStore.getState().setUserStatus(data.status, data.suspendedUntil);

                if (data.status === "BANNED") {
                    toastIdRef.current = toast.error("Cuenta baneada", {
                        description: "Tu cuenta ha sido baneada. Se cerrará tu sesión en 10 segundos.",
                        duration: LOGOUT_DELAY,
                    });
                    startLogoutCountdown();
                } else if (data.status === "SUSPENDED" && data.suspendedUntil) {
                    const until = new Date(data.suspendedUntil).toLocaleString("es-ES", {
                        day: "numeric", month: "long", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                    });
                    toastIdRef.current = toast.warning("Cuenta suspendida", {
                        description: `Tu cuenta está suspendida hasta el ${until}. Se cerrará tu sesión en 10 segundos.`,
                        duration: LOGOUT_DELAY,
                    });
                    startLogoutCountdown();
                }
            } catch {
                // Silenciar errores de red
            }
        };

        const intervalId = setInterval(poll, POLL_INTERVAL);
        poll();

        return () => {
            cancelled = true;
            clearInterval(intervalId);
            if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
            pendingRef.current = false;
        };
    }, [isAuthenticated, navigate]);
}
