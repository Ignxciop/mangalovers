import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { api } from "@/api/axios";
import { useAuthStore } from "@/store/authStore";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4008/api";

const mockUser = {
    id: "1",
    name: "Test",
    lastname: "User",
    email: "test@test.com",
    role: "USER" as const,
};

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => {
    server.resetHandlers();
    useAuthStore.getState().logout();
});
afterAll(() => server.close());

describe("request interceptor", () => {
    it("agrega Bearer token cuando hay sesión", async () => {
        useAuthStore.getState().setAuth("test-token", mockUser);

        server.use(
            http.get(`${API_URL}/test-auth`, ({ request }) => {
                const auth = request.headers.get("Authorization");
                expect(auth).toBe("Bearer test-token");
                return HttpResponse.json({ ok: true });
            }),
        );

        const res = await api.get("/test-auth");
        expect(res.data).toEqual({ ok: true });
    });

    it("no agrega token cuando no hay sesión", async () => {
        server.use(
            http.get(`${API_URL}/test-no-auth`, ({ request }) => {
                const auth = request.headers.get("Authorization");
                expect(auth).toBeNull();
                return HttpResponse.json({ ok: true });
            }),
        );

        const res = await api.get("/test-no-auth");
        expect(res.data).toEqual({ ok: true });
    });
});

describe("response interceptor", () => {
    it("retorna respuesta en 200", async () => {
        server.use(
            http.get(`${API_URL}/success`, () =>
                HttpResponse.json({ data: "ok" }),
            ),
        );

        const res = await api.get("/success");
        expect(res.data).toEqual({ data: "ok" });
    });

    it("propaga errores que no son 401", async () => {
        server.use(
            http.get(`${API_URL}/server-error`, () =>
                new HttpResponse(null, { status: 500 }),
            ),
        );

        await expect(api.get("/server-error")).rejects.toThrow();
    });

    it("no intercepta 401 en rutas /auth/", async () => {
        server.use(
            http.get(`${API_URL}/auth/me`, () =>
                new HttpResponse(null, { status: 401 }),
            ),
        );

        await expect(api.get("/auth/me")).rejects.toThrow();
    });

    it("reintenta con refresh en 401 de ruta no auth", async () => {
        let callCount = 0;
        useAuthStore.getState().setAuth("expired-token", mockUser);

        server.use(
            http.post(`${API_URL}/auth/refresh`, () =>
                HttpResponse.json({
                    data: { accessToken: "new-token", user: mockUser },
                }),
            ),
            http.get(`${API_URL}/test-retry`, ({ request }) => {
                callCount++;
                const auth = request.headers.get("Authorization");
                if (callCount === 1) {
                    expect(auth).toBe("Bearer expired-token");
                    return new HttpResponse(null, { status: 401 });
                }
                expect(auth).toBe("Bearer new-token");
                return HttpResponse.json({ success: true });
            }),
        );

        const res = await api.get("/test-retry");
        expect(res.data).toEqual({ success: true });
        expect(callCount).toBe(2);
        expect(useAuthStore.getState().accessToken).toBe("new-token");
    });

    it("hace logout si refresh falla en 401", async () => {
        useAuthStore.getState().setAuth("expired-token", mockUser);

        server.use(
            http.post(`${API_URL}/auth/refresh`, () =>
                new HttpResponse(null, { status: 403 }),
            ),
            http.get(`${API_URL}/test-logout`, () =>
                new HttpResponse(null, { status: 401 }),
            ),
        );

        await expect(api.get("/test-logout")).rejects.toThrow();
        expect(useAuthStore.getState().isAuthenticated).toBe(false);
        expect(useAuthStore.getState().user).toBeNull();
    });
});
