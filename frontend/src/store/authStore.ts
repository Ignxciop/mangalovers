import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";

interface User {
    id: string;
    name: string;
    lastname: string;
    email: string;
}

interface AuthState {
    accessToken: string | null;
    user: User | null;
    isAuthenticated: boolean;

    setAuth: (accessToken: string, user: User) => void;
    setAccessToken: (accessToken: string) => void;
    logout: () => void;
    bootstrapping: boolean;
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

            logout: () => {
                set({
                    accessToken: null,
                    user: null,
                    isAuthenticated: false,
                });
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
            }),
        },
    ),
);
