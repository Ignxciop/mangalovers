import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPost = vi.hoisted(() => vi.fn());

vi.mock("axios", () => ({
    default: { post: mockPost },
}));

import { useAuthStore } from "@/store/authStore";

const mockUser = {
    id: "1",
    name: "Test",
    lastname: "User",
    email: "test@test.com",
    role: "USER" as const,
};

describe("useAuthStore", () => {
    beforeEach(() => {
        useAuthStore.setState({
            accessToken: null,
            user: null,
            isAuthenticated: false,
            bootstrapping: false,
        });
        mockPost.mockReset();
        localStorage.clear();
    });

    it("estado inicial", () => {
        const s = useAuthStore.getState();
        expect(s.accessToken).toBeNull();
        expect(s.user).toBeNull();
        expect(s.isAuthenticated).toBe(false);
        expect(s.bootstrapping).toBe(false);
    });

    it("setAuth establece user, token y authenticated", () => {
        useAuthStore.getState().setAuth("token-123", mockUser);
        const s = useAuthStore.getState();
        expect(s.accessToken).toBe("token-123");
        expect(s.user).toEqual(mockUser);
        expect(s.isAuthenticated).toBe(true);
    });

    it("setAccessToken solo cambia el token", () => {
        useAuthStore.getState().setAuth("token-1", mockUser);
        useAuthStore.getState().setAccessToken("token-2");
        expect(useAuthStore.getState().accessToken).toBe("token-2");
        expect(useAuthStore.getState().user?.id).toBe("1");
    });

    it("logout limpia todo", () => {
        useAuthStore.getState().setAuth("token-123", mockUser);
        useAuthStore.getState().logout();
        const s = useAuthStore.getState();
        expect(s.accessToken).toBeNull();
        expect(s.user).toBeNull();
        expect(s.isAuthenticated).toBe(false);
    });

    it("logout elimina persist de localStorage", () => {
        localStorage.setItem(
            "mangalovers-auth",
            JSON.stringify({ state: { user: mockUser, isAuthenticated: true } }),
        );

        useAuthStore.getState().logout();
        expect(localStorage.getItem("mangalovers-auth")).toBeNull();
    });

    it("partialize persiste accessToken, user e isAuthenticated", () => {
        useAuthStore.getState().setAuth("secret-token", mockUser);
        const raw = localStorage.getItem("mangalovers-auth");
        expect(raw).not.toBeNull();
        const parsed = JSON.parse(raw!);
        expect(parsed.state.accessToken).toBe("secret-token");
        expect(parsed.state.user).toEqual(mockUser);
        expect(parsed.state.isAuthenticated).toBe(true);
    });

    it("bootstrap success: llama refresh y setea auth", async () => {
        mockPost.mockResolvedValueOnce({
            data: { data: { accessToken: "refreshed-token", user: mockUser } },
        });

        useAuthStore.setState({ bootstrapping: true });
        await useAuthStore.getState().bootstrap();

        const s = useAuthStore.getState();
        expect(s.accessToken).toBe("refreshed-token");
        expect(s.user).toEqual(mockUser);
        expect(s.isAuthenticated).toBe(true);
        expect(s.bootstrapping).toBe(false);
    });

    it("bootstrap failure: limpia auth y pone bootstrapping false", async () => {
        mockPost.mockRejectedValueOnce(new Error("refresh fail"));

        useAuthStore.setState({
            bootstrapping: true,
            accessToken: "old",
            user: mockUser,
            isAuthenticated: true,
        });
        await useAuthStore.getState().bootstrap();

        const s = useAuthStore.getState();
        expect(s.accessToken).toBeNull();
        expect(s.user).toBeNull();
        expect(s.isAuthenticated).toBe(false);
        expect(s.bootstrapping).toBe(false);
    });

    it("bootstrap failure: persist almacena estado limpio en localStorage", async () => {
        mockPost.mockRejectedValueOnce(new Error("fail"));
        localStorage.setItem(
            "mangalovers-auth",
            JSON.stringify({ state: { user: mockUser, isAuthenticated: true } }),
        );

        useAuthStore.setState({ bootstrapping: true });
        await useAuthStore.getState().bootstrap();

        const persisted = JSON.parse(localStorage.getItem("mangalovers-auth")!);
        expect(persisted.state.isAuthenticated).toBe(false);
        expect(persisted.state.user).toBeNull();
    });

    it("bootstrap dedup: solo hace una llamada aunque se invoque varias veces", async () => {
        mockPost.mockResolvedValue({
            data: { data: { accessToken: "t", user: mockUser } },
        });

        useAuthStore.setState({ bootstrapping: true });
        await Promise.all([
            useAuthStore.getState().bootstrap(),
            useAuthStore.getState().bootstrap(),
        ]);
        expect(mockPost).toHaveBeenCalledTimes(1);
    });
});
