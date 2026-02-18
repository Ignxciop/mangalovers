import axios from "axios";
import { useAuthStore } from "@/store/authStore.ts";

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value: string) => void;
    reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token!);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise<string>((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            })
                .then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                })
                .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            const currentRefreshToken = useAuthStore.getState().refreshToken;

            if (!currentRefreshToken) {
                throw new Error("No refresh token available");
            }

            const { data } = await axios.post(
                `${import.meta.env.VITE_API_URL ?? "http://localhost:3000/api"}/auth/refresh`,
                { refreshToken: currentRefreshToken },
            );

            const {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            } = data;

            useAuthStore
                .getState()
                .setAuth(
                    newAccessToken,
                    newRefreshToken,
                    useAuthStore.getState().user!,
                );

            processQueue(null, newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError, null);
            useAuthStore.getState().logout();
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    },
);
