import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockLoginApi = vi.fn();
const mockGoogleLoginApi = vi.fn();
const mockRegisterApi = vi.fn();
const mockLogoutApi = vi.fn();

vi.mock("@/api/auth", () => ({
    login: (...args: unknown[]) => mockLoginApi(...args),
    googleLogin: (...args: unknown[]) => mockGoogleLoginApi(...args),
    register: (...args: unknown[]) => mockRegisterApi(...args),
    logout: (...args: unknown[]) => mockLogoutApi(...args),
}));

const mockSetAuth = vi.fn();
const mockClearStore = vi.fn();
const mockNavigate = vi.fn();

let mockAuthStoreReturn: {
    setAuth: typeof mockSetAuth;
    logout: typeof mockClearStore;
    isAuthenticated: boolean;
    user: { id: string; name: string; lastname: string; email: string; role: "ADMIN" | "USER" } | null;
} = {
    setAuth: mockSetAuth,
    logout: mockClearStore,
    isAuthenticated: false,
    user: null,
};

vi.mock("@/store/authStore", () => ({
    useAuthStore: vi.fn(() => mockAuthStoreReturn),
}));

vi.mock("react-router-dom", () => ({
    useNavigate: () => mockNavigate,
}));

import { useAuth } from "@/hooks/useAuth";

const mockUserData = {
    accessToken: "token-abc",
    user: {
        id: "1",
        name: "Test",
        lastname: "User",
        email: "t@t.com",
        role: "USER" as const,
    },
};

const testUser = mockUserData.user;

describe("useAuth", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthStoreReturn = {
            setAuth: mockSetAuth,
            logout: mockClearStore,
            isAuthenticated: false,
            user: null,
        };
    });

    describe("login", () => {
        const payload = { email: "test@test.com", password: "secret" };

        it("llama login API, setea auth y navega a / en éxito", async () => {
            mockLoginApi.mockResolvedValueOnce(mockUserData);

            const { result } = renderHook(() => useAuth());

            await act(async () => {
                await result.current.login(payload);
            });

            expect(mockLoginApi).toHaveBeenCalledWith(payload);
            expect(mockSetAuth).toHaveBeenCalledWith("token-abc", testUser);
            expect(mockNavigate).toHaveBeenCalledWith("/");
        });

        it("setea isLoading durante la llamada", async () => {
            let resolvePromise!: (v: unknown) => void;
            mockLoginApi.mockReturnValueOnce(
                new Promise((r) => {
                    resolvePromise = r;
                }),
            );

            const { result } = renderHook(() => useAuth());
            expect(result.current.isLoading).toBe(false);

            let promise: Promise<void>;
            act(() => {
                promise = result.current.login(payload);
            });

            expect(result.current.isLoading).toBe(true);

            await act(async () => {
                resolvePromise(mockUserData);
                await promise!;
            });

            expect(result.current.isLoading).toBe(false);
        });

        it("setea error cuando login falla con response.data.message", async () => {
            const axiosError = {
                response: { data: { message: "Credenciales inválidas" } },
            };
            mockLoginApi.mockRejectedValueOnce(axiosError);

            const { result } = renderHook(() => useAuth());

            await act(async () => {
                await result.current.login(payload);
            });

            expect(result.current.error).toBe("Credenciales inválidas");
            expect(mockSetAuth).not.toHaveBeenCalled();
        });

        it("setea error genérico si no hay response.data.message", async () => {
            mockLoginApi.mockRejectedValueOnce(new Error("network"));

            const { result } = renderHook(() => useAuth());

            await act(async () => {
                await result.current.login(payload);
            });

            expect(result.current.error).toBe(
                "Ocurrió un error inesperado. Intenta de nuevo.",
            );
        });
    });

    describe("loginWithGoogle", () => {
        it("llama googleLogin API, setea auth y navega", async () => {
            mockGoogleLoginApi.mockResolvedValueOnce(mockUserData);

            const { result } = renderHook(() => useAuth());

            await act(async () => {
                await result.current.loginWithGoogle("google-id-token");
            });

            expect(mockGoogleLoginApi).toHaveBeenCalledWith("google-id-token");
            expect(mockSetAuth).toHaveBeenCalledWith("token-abc", testUser);
            expect(mockNavigate).toHaveBeenCalledWith("/");
        });

        it("setea error si google login falla", async () => {
            mockGoogleLoginApi.mockRejectedValueOnce({
                response: { data: { message: "Token inválido" } },
            });

            const { result } = renderHook(() => useAuth());

            await act(async () => {
                await result.current.loginWithGoogle("bad-token");
            });

            expect(result.current.error).toBe("Token inválido");
        });
    });

    describe("register", () => {
        const payload = {
            name: "Test",
            lastname: "User",
            email: "t@t.com",
            password: "123456",
        };

        it("llama register API, setea auth y navega", async () => {
            mockRegisterApi.mockResolvedValueOnce(mockUserData);

            const { result } = renderHook(() => useAuth());

            await act(async () => {
                await result.current.register(payload);
            });

            expect(mockRegisterApi).toHaveBeenCalledWith(payload);
            expect(mockSetAuth).toHaveBeenCalledWith("token-abc", testUser);
            expect(mockNavigate).toHaveBeenCalledWith("/");
        });

        it("setea error si register falla", async () => {
            mockRegisterApi.mockRejectedValueOnce({
                response: { data: { message: "Email ya registrado" } },
            });

            const { result } = renderHook(() => useAuth());

            await act(async () => {
                try {
                    await result.current.register(payload);
                } catch { /* expected throw */ }
            });

            expect(result.current.error).toBe("Email ya registrado");
        });
    });

    describe("logout", () => {
        it("llama API logout, limpia store y navega", async () => {
            mockLogoutApi.mockResolvedValueOnce(undefined);

            const { result } = renderHook(() => useAuth());

            await act(async () => {
                await result.current.logout();
            });

            expect(mockLogoutApi).toHaveBeenCalled();
            expect(mockClearStore).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith("/");
        });

        it("limpia store incluso si API logout falla", async () => {
            mockLogoutApi.mockRejectedValueOnce(new Error("network"));

            const { result } = renderHook(() => useAuth());

            await act(async () => {
                await result.current.logout();
            });

            expect(mockClearStore).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith("/");
        });
    });

    describe("estado expuesto", () => {
        it("expone isAuthenticated y user desde el store", () => {
            mockAuthStoreReturn = {
                setAuth: mockSetAuth,
                logout: mockClearStore,
                isAuthenticated: true,
                user: testUser,
            };

            const { result } = renderHook(() => useAuth());
            expect(result.current.isAuthenticated).toBe(true);
            expect(result.current.user).toEqual(testUser);
        });
    });
});
