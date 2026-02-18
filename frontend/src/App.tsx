import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthLayout from "./components/layouts/authLayout.tsx";
import Login from "./pages/loginForm.tsx";
import Register from "./pages/registerForm.tsx";
import { ThemeProvider } from "@/components/theme-provider";
import { ProtectedRoute, GuestRoute } from "@/components/protectedRoutes.tsx";
import MainLayout from "./components/layouts/mainLayout.tsx";
import Dashboard from "./pages/dashboard.tsx";

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
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
