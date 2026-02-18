import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthLayout from "./layouts/authLayout.tsx";
import Login from "./pages/login.tsx";
import Register from "./pages/register.tsx";
import { ThemeProvider } from "@/components/theme-provider";

function App() {
    return (
        <>
            <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
                <BrowserRouter>
                    <Routes>
                        <Route element={<AuthLayout />}>
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </ThemeProvider>
        </>
    );
}

export default App;
