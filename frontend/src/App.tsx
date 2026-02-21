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

function SmartDirect() {
    const isAutenticated = useAuthStore((s) => s.isAuthenticated);
    return <Navigate to={isAutenticated ? "/" : "/acceso"} replace />;
}

function App() {
    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <BrowserRouter>
                <Routes>
                    <Route element={<GuestRoute />}>
                        <Route element={<AuthLayout />}>
                            <Route path="/acceso" element={<Login />} />
                            <Route path="/registro" element={<Register />} />
                        </Route>
                    </Route>
                    <Route element={<ProtectedRoute />}>
                        <Route element={<MainLayout />}>
                            <Route path="/" element={<Home />} />
                            <Route path="/mangas" element={<MangaList />} />
                        </Route>
                    </Route>
                    <Route path="*" element={<SmartDirect />} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
