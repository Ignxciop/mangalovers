import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import AuthLayout from "./components/layouts/authLayout.tsx";
import { ThemeProvider } from "@/components/theme-provider";
import { ProtectedRoute, GuestRoute } from "@/components/protectedRoutes.tsx";
import { AdminRoute } from "@/components/adminRoute.tsx";
import MainLayout from "./components/layouts/mainLayout.tsx";
import AdminLayout from "./components/layouts/adminLayout.tsx";
import { useAuthStore } from "./store/authStore.ts";

const Login = lazy(() => import("./pages/loginForm.tsx").then((m) => ({ default: m.Login })));
const Register = lazy(() => import("./pages/registerForm.tsx").then((m) => ({ default: m.Register })));
const Home = lazy(() => import("./pages/home.tsx"));
const MangaList = lazy(() => import("./pages/mangaList.tsx"));
const MangaDetail = lazy(() => import("./pages/mangaDetail.tsx"));
const ChapterReader = lazy(() => import("./pages/chapterReader.tsx"));
const FavoritesList = lazy(() => import("./pages/favoriteList.tsx"));
const TermsOfService = lazy(() => import("./pages/termsOfService.tsx"));
const PrivacyPolicy = lazy(() => import("./pages/privacyPolicy.tsx"));
const ProfilePage = lazy(() => import("./pages/profilePage.tsx"));
const StatsPage = lazy(() => import("./pages/statsPage.tsx"));
const AdminSuggestions = lazy(() => import("./pages/adminSuggestions.tsx"));
const AdminDashboard = lazy(() => import("./pages/adminDashboard.tsx"));
const AdminUsers = lazy(() => import("./pages/adminUsers.tsx"));
const AdminMetrics = lazy(() => import("./pages/adminMetrics.tsx"));
const AdminActivityLogs = lazy(() => import("./pages/adminActivityLogs.tsx"));

function SmartDirect() {
    const isAutenticated = useAuthStore((s) => s.isAuthenticated);
    return <Navigate to={isAutenticated ? "/" : "/acceso"} replace />;
}

function BootstrappedApp() {
    const bootstrapping = useAuthStore((s) => s.bootstrapping);
    const bootstrap = useAuthStore((s) => s.bootstrap);

    useEffect(() => {
        bootstrap();
    }, [bootstrap]);

    if (bootstrapping) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-3">
                    <div className="size-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                    <p className="text-sm text-muted-foreground">Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
}

function AppRoutes() {
    return (
        <>
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:ring-2 focus:ring-ring focus:rounded-lg focus:text-sm focus:font-medium"
            >
                Saltar al contenido principal
            </a>
            <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen bg-background">
                    <div className="size-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                </div>
            }>
            <Routes>
                <Route element={<GuestRoute />}>
                    <Route element={<AuthLayout />}>
                        <Route path="/acceso" element={<Login />} />
                        <Route path="/registro" element={<Register />} />
                        <Route
                            path="/terminos"
                            element={<TermsOfService />}
                        />
                        <Route
                            path="/privacidad"
                            element={<PrivacyPolicy />}
                        />
                    </Route>
                </Route>

                <Route element={<MainLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/mangas" element={<MangaList />} />
                    <Route path="/manga/:slug" element={<MangaDetail />} />
                    <Route
                        path="/manga/:slug/capitulo/:chapterId"
                        element={<ChapterReader />}
                    />

                    <Route element={<ProtectedRoute />}>
                        <Route
                            path="/favoritos"
                            element={<FavoritesList />}
                        />
                        <Route path="/perfil" element={<ProfilePage />} />
                        <Route
                            path="/estadisticas"
                            element={<StatsPage />}
                        />
                    </Route>

                </Route>

                <Route element={<AdminRoute />}>
                    <Route element={<AdminLayout />}>
                        <Route
                            path="/admin/dashboard"
                            element={<AdminDashboard />}
                        />
                        <Route
                            path="/admin/usuarios"
                            element={<AdminUsers />}
                        />
                        <Route
                            path="/admin/sugerencias"
                            element={<AdminSuggestions />}
                        />
                        <Route
                            path="/admin/metricas"
                            element={<AdminMetrics />}
                        />
                        <Route
                            path="/admin/logs"
                            element={<AdminActivityLogs />}
                        />
                    </Route>
                </Route>

                <Route path="*" element={<SmartDirect />} />
            </Routes>
            </Suspense>
        </>
    );
}

function App() {
    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 3000,
                    className: "text-sm",
                }}
            />
            <BootstrappedApp />
        </ThemeProvider>
    );
}

export default App;
