import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";

interface User {
    id: string;
    name: string;
    lastname: string;
    email: string;
    role: "ADMIN" | "USER";
    alias?: string | null;
    aliasChanged?: boolean;
    avatarUrl?: string | null;
    status?: "ACTIVE" | "SUSPENDED" | "BANNED";
    suspendedUntil?: string | null;
    profileVisibility?: "PUBLIC" | "FRIENDS" | "PRIVATE";
    hideOnline?: boolean;
}

interface AuthState {
    accessToken: string | null;
    user: User | null;
    isAuthenticated: boolean;
    bootstrapping: boolean;

    setAuth: (accessToken: string, user: User) => void;
    setAccessToken: (accessToken: string) => void;
    setUserStatus: (status: User["status"], suspendedUntil: User["suspendedUntil"]) => void;
    logout: () => void;
    bootstrap: () => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL;

let bootstrappingPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            accessToken: null,
            user: null,
            isAuthenticated: false,
            bootstrapping: true,

            setAuth: (accessToken, user) => {
                set({ accessToken, user, isAuthenticated: true });
            },

            setAccessToken: (accessToken) => set({ accessToken }),

            setUserStatus: (status, suspendedUntil) => {
                const user = useAuthStore.getState().user;
                if (user) set({ user: { ...user, status, suspendedUntil } });
            },

            logout: () => {
                set({
                    accessToken: null,
                    user: null,
                    isAuthenticated: false,
                });
                try {
                    localStorage.removeItem("mangalovers-auth");
                } catch {
                    // Silenciar errores de localStorage
                }
            },

            bootstrap: async () => {
                if (bootstrappingPromise) return bootstrappingPromise;

                bootstrappingPromise = (async () => {
                    try {
                        const { data } = await axios.post(
                            `${API_URL}/auth/refresh`,
                            {},
                            { withCredentials: true },
                        );
                        const { accessToken, user } = data.data;
                        set({ accessToken, user, isAuthenticated: true });
                    } catch {
                        set({
                            accessToken: null,
                            user: null,
                            isAuthenticated: false,
                        });
                        try {
                            localStorage.removeItem("mangalovers-auth");
                        } catch {
                            // Silenciar errores de localStorage
                        }
                    } finally {
                        set({ bootstrapping: false });
                        bootstrappingPromise = null;
                    }
                })();

                return bootstrappingPromise;
            },
        }),
        {
            name: "mangalovers-auth",
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
                accessToken: state.accessToken,
            }),
        },
    ),
);
