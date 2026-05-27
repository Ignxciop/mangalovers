import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Login } from "@/pages/loginForm";

const mockLogin = vi.fn();
const mockLoginWithGoogle = vi.fn();

let mockUseAuthReturn: {
    login: typeof mockLogin;
    loginWithGoogle: typeof mockLoginWithGoogle;
    isLoading: boolean;
    error: string | null;
    isAuthenticated: boolean;
    user: { id: string; name: string; lastname: string; email: string; role: "ADMIN" | "USER" } | null;
    logout: () => void;
    register: () => void;
} = {
    login: mockLogin,
    loginWithGoogle: mockLoginWithGoogle,
    isLoading: false,
    error: null,
    isAuthenticated: false,
    user: null,
    logout: vi.fn(),
    register: vi.fn(),
};

vi.mock("@/hooks/useAuth", () => ({
    useAuth: vi.fn(() => mockUseAuthReturn),
}));

vi.mock("@/api/auth", () => ({
    fetchGoogleClientId: vi.fn(() => Promise.resolve("mock-client-id-123")),
}));

function renderLogin() {
    return render(
        <HelmetProvider>
            <SidebarProvider>
                <MemoryRouter>
                    <Login />
                </MemoryRouter>
            </SidebarProvider>
        </HelmetProvider>,
    );
}

describe("Login page", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuthReturn = {
            login: mockLogin,
            loginWithGoogle: mockLoginWithGoogle,
            isLoading: false,
            error: null,
            isAuthenticated: false,
            user: null,
            logout: vi.fn(),
            register: vi.fn(),
        };
    });

    it("renderiza el formulario de login", () => {
        renderLogin();
        expect(screen.getByText("Bienvenido de nuevo")).toBeInTheDocument();
        expect(screen.getByLabelText("Email")).toBeInTheDocument();
        expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /iniciar sesión/i }),
        ).toBeInTheDocument();
    });

    it("llama login con email y password al submit", async () => {
        const user = userEvent.setup();
        renderLogin();

        await user.type(screen.getByLabelText("Email"), "user@test.com");
        await user.type(screen.getByLabelText("Contraseña"), "mypassword");
        await user.click(
            screen.getByRole("button", { name: /iniciar sesión/i }),
        );

        expect(mockLogin).toHaveBeenCalledWith({
            email: "user@test.com",
            password: "mypassword",
        });
    });

    it("renderiza Google sign-in cuando clientId está disponible", async () => {
        renderLogin();
        await waitFor(() => {
            expect(screen.getByText("o")).toBeInTheDocument();
        });
    });

    it("renderiza el enlace 'Continuar sin cuenta'", () => {
        renderLogin();
        expect(screen.getByText("Continuar sin cuenta")).toBeInTheDocument();
    });

    it("renderiza el enlace de registro", () => {
        renderLogin();
        expect(screen.getByText("Registrate")).toBeInTheDocument();
    });

    it("muestra error cuando está presente", () => {
        mockUseAuthReturn = {
            ...mockUseAuthReturn,
            error: "Credenciales inválidas",
        };

        renderLogin();
        expect(screen.getByText("Credenciales inválidas")).toBeInTheDocument();
    });

    it("deshabilita botón durante loading", () => {
        mockUseAuthReturn = {
            ...mockUseAuthReturn,
            isLoading: true,
        };

        renderLogin();
        expect(
            screen.getByRole("button", { name: /iniciando sesión/i }),
        ).toBeDisabled();
    });
});
