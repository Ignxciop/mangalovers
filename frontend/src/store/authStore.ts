import { create } from "zustand";
import { persist } from "zustand/middleware";

const REFRESH_TOKEN_KEY = "mangalovers-refresh-token";

interface User {
    id: string;
    name: string;
    lastname: string;
    email: string;
}

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    user: User | null;
    isAuthenticated: boolean;

    setAuth: (
        accessToken: string,
        refreshToken: string,
        user: User,
        rememberMe: boolean,
    ) => void;
    setAccessToken: (accessToken: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            accessToken: null,
            refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
            user: null,
            isAuthenticated: false,

            setAuth: (accessToken, refreshToken, user, rememberMe) => {
                if (rememberMe) {
                    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
                } else {
                    localStorage.removeItem(REFRESH_TOKEN_KEY);
                }
                set({ accessToken, refreshToken, user, isAuthenticated: true });
            },

            setAccessToken: (accessToken) => set({ accessToken }),

            logout: () => {
                localStorage.removeItem(REFRESH_TOKEN_KEY);
                set({
                    accessToken: null,
                    refreshToken: null,
                    user: null,
                    isAuthenticated: false,
                });
            },
        }),
        {
            name: "mangalovers-auth",
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        },
    ),
);
