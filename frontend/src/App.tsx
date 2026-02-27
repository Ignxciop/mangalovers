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

function SmartDirect() {
    const isAutenticated = useAuthStore((s) => s.isAuthenticated);
    return <Navigate to={isAutenticated ? "/" : "/acceso"} replace />;
}

function App() {
    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <BrowserRouter>
                <Routes>
                    {/* Rutas públicas de guest */}
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

                    {/* Rutas públicas con MainLayout */}
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/mangas" element={<MangaList />} />
                        <Route path="/manga/:slug" element={<MangaDetail />} />
                        <Route
                            path="/manga/:slug/capitulo/:chapterId"
                            element={<ChapterReader />}
                        />

                        {/* Favoritos protegido pero dentro del mismo layout */}
                        <Route element={<ProtectedRoute />}>
                            <Route
                                path="/favoritos"
                                element={<FavoritesList />}
                            />
                            <Route path="/perfil" element={<ProfilePage />} />
                        </Route>
                    </Route>

                    <Route path="*" element={<SmartDirect />} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
