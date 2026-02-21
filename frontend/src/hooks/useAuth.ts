import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as authApi from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import type { LoginPayload, RegisterPayload } from "@/api/auth";

export function useAuth() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        setAuth,
        logout: clearStore,
        isAuthenticated,
        user,
    } = useAuthStore();
    const navigate = useNavigate();


    const login = async (payload: LoginPayload) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await authApi.login(payload);
            setAuth(data.accessToken, data.refreshToken, data.user);
            navigate("/");
        } catch (err: unknown) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (payload: RegisterPayload) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await authApi.register(payload);
            setAuth(data.accessToken, data.refreshToken, data.user);
            navigate("/");
        } catch (err: unknown) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            const refreshToken = useAuthStore.getState().refreshToken;
            if (refreshToken) {
                await authApi.logout(refreshToken);
            }
        } catch {
            // Silenciar
        } finally {
            clearStore();
            navigate("/acceso");
        }
    };

    return { login, register, logout, isLoading, error, isAuthenticated, user };
}

function getErrorMessage(err: unknown): string {
    if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "message" in err.response.data
    ) {
        return String((err.response.data as { message: string }).message);
    }
    return "Ocurrió un error inesperado. Intenta de nuevo.";
}
