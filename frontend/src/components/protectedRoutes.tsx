import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { getMyStatus } from "@/api/auth";
import { NotificationPromptModal } from "@/components/notificationPromptModal";

function BootstrappingFallback() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="flex flex-col items-center gap-3">
                <div className="size-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground">Cargando...</p>
            </div>
        </div>
    );
}

export function ProtectedRoute() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const bootstrapping = useAuthStore((s) => s.bootstrapping);
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        if (bootstrapping || !isAuthenticated) return;

        let cancelled = false;

        const check = async () => {
            setVerifying(true);
            try {
                const { status, suspendedUntil } = await getMyStatus();
                if (cancelled) return;

                useAuthStore.getState().setUserStatus(status, suspendedUntil);

                if (status === "BANNED") {
                    toast.error("Cuenta baneada", {
                        description: "Tu cuenta ha sido baneada.",
                    });
                    useAuthStore.getState().logout();
                    return;
                }

                if (status === "SUSPENDED" && suspendedUntil) {
                    const until = new Date(suspendedUntil).toLocaleString("es-ES", {
                        day: "numeric", month: "long", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                    });
                    toast.warning("Cuenta suspendida", {
                        description: `Tu cuenta está suspendida hasta el ${until}.`,
                    });
                    useAuthStore.getState().logout();
                    return;
                }
            } catch {
                // Silenciar errores de red
            } finally {
                if (!cancelled) setVerifying(false);
            }
        };

        check();

        return () => {
            cancelled = true;
        };
    }, [bootstrapping, isAuthenticated]);

    if (bootstrapping) return <BootstrappingFallback />;

    if (!isAuthenticated) {
        return <Navigate to="/acceso" replace />;
    }

    if (verifying) return <BootstrappingFallback />;

    return (
        <>
            <NotificationPromptModal />
            <Outlet />
        </>
    );
}

export function GuestRoute() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const bootstrapping = useAuthStore((s) => s.bootstrapping);

    if (bootstrapping) return <BootstrappingFallback />;

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
