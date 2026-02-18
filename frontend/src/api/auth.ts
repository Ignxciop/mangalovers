import { api } from "./axios";

export interface RegisterPayload {
    name: string;
    lastname: string;
    email: string;
    password: string;
}

export interface LoginPayload {
    email: string;
    password: string;
}
interface AuthData {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        name: string;
        lastname: string;
        email: string;
    };
}

interface AuthResponse {
    success: boolean;
    message: string;
    data: AuthData;
}

export const register = async (payload: RegisterPayload): Promise<AuthData> => {
    const { data: response } = await api.post<AuthResponse>(
        "/auth/register",
        payload,
    );
    return response.data;
};

export const login = async (payload: LoginPayload): Promise<AuthData> => {
    const { data: response } = await api.post<AuthResponse>(
        "/auth/login",
        payload,
    );
    return response.data;
};

export const logout = async (refreshToken: string): Promise<void> => {
    await api.post("/auth/logout", { refreshToken });
};

export const refresh = async (): Promise<AuthData> => {
    const { data: response } = await api.post<AuthResponse>("/auth/refresh");
    return response.data;
};
