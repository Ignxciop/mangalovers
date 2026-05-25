import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export function AdminRoute() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const user = useAuthStore((s) => s.user);
    const bootstrapping = useAuthStore((s) => s.bootstrapping);

    if (bootstrapping) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="size-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated || user?.role !== "ADMIN") {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
