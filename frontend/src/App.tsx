import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthLayout from "./components/layouts/authLayout.tsx";
import Login from "./pages/loginForm.tsx";
import Register from "./pages/registerForm.tsx";
import { ThemeProvider } from "@/components/theme-provider";
import { ProtectedRoute, GuestRoute } from "@/components/protectedRoutes.tsx";
import MainLayout from "./components/layouts/mainLayout.tsx";
import Dashboard from "./pages/dashboard.tsx";
import { useAuthStore } from "./store/authStore.ts";

function SmartDirect() {
    const isAutenticated = useAuthStore((s) => s.isAuthenticated);
    return <Navigate to={isAutenticated ? "/dashboard" : "/login"} replace />;
}

function App() {
    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <BrowserRouter>
                <Routes>
                    <Route element={<GuestRoute />}>
                        <Route element={<AuthLayout />}>
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                        </Route>
                    </Route>
                    <Route element={<ProtectedRoute />}>
                        <Route element={<MainLayout />}>
                            <Route path="/dashboard" element={<Dashboard />} />
                        </Route>
                    </Route>
                    <Route path="*" element={<SmartDirect />} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
