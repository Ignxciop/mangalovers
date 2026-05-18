import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthLayout from "./components/layouts/authLayout.tsx";
import { Login } from "./pages/loginForm.tsx";
import { Register } from "./pages/registerForm.tsx";
import { ThemeProvider } from "@/components/theme-provider";
import { ProtectedRoute, GuestRoute } from "@/components/protectedRoutes.tsx";
import MainLayout from "./components/layouts/mainLayout.tsx";
import Home from "./pages/home.tsx";
import { useAuthStore } from "./store/authStore.ts";
import MangaList from "./pages/mangaList.tsx";
import MangaDetail from "./pages/mangaDetail.tsx";
import ChapterReader from "./pages/chapterReader.tsx";
import FavoritesList from "./pages/favoriteList.tsx";
import TermsOfService from "./pages/termsOfService.tsx";
import PrivacyPolicy from "./pages/privacyPolicy.tsx";
import ProfilePage from "./pages/profilePage.tsx";
import StatsPage from "./pages/statsPage.tsx";

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
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:ring-2 focus:ring-ring focus:rounded-lg focus:text-sm focus:font-medium"
            >
                Saltar al contenido principal
            </a>
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

                <Route path="*" element={<SmartDirect />} />
            </Routes>
        </BrowserRouter>
    );
}

function App() {
    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <BootstrappedApp />
        </ThemeProvider>
    );
}

export default App;
