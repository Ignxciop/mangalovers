import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { NotificationPromptModal } from "@/components/notificationPromptModal";

export function ProtectedRoute() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

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

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
