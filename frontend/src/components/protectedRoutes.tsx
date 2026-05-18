import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
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

    if (bootstrapping) return <BootstrappingFallback />;

    if (!isAuthenticated) {
        return <Navigate to="/acceso" replace />;
    }

    return (
        <>
            {/*
        El modal vive aquí para que:
        1. Solo se monte cuando el usuario está autenticado
        2. Esté disponible en todas las rutas protegidas sin duplicarse
        3. useNotificationPrompt controla internamente si debe mostrarse o no
      */}
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
