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
    user: {
        id: string;
        name: string;
        lastname: string;
        email: string;
        role: "ADMIN" | "USER";
        status?: "ACTIVE" | "SUSPENDED" | "BANNED";
        suspendedUntil?: string | null;
    };
}

interface AuthResponse {
    success: boolean;
    message: string;
    data: AuthData;
}

interface UserStatusResponse {
    success: boolean;
    data: {
        status: "ACTIVE" | "SUSPENDED" | "BANNED";
        suspendedUntil: string | null;
    };
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

export const logout = async (): Promise<void> => {
    await api.post("/auth/logout");
};

export const googleLogin = async (
    idToken: string,
): Promise<AuthData> => {
    const { data: response } = await api.post<AuthResponse>(
        "/auth/google",
        { idToken },
    );
    return response.data;
};

export const getMyStatus = async (): Promise<UserStatusResponse["data"]> => {
    const { data: response } = await api.get<UserStatusResponse>("/auth/status");
    return response.data;
};

export const fetchGoogleClientId = async (): Promise<string> => {
    const { data: response } = await api.get<{
        success: boolean;
        data: { clientId: string };
    }>("/auth/google-client-id");
    return response.data.clientId;
};
