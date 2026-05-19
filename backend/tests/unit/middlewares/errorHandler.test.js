import { describe, it, expect, vi } from "vitest";

function mockReq() {
    return { path: "/test", method: "GET" };
}

function mockRes() {
    const json = vi.fn().mockReturnThis();
    return {
        status: vi.fn().mockReturnValue({ json }),
        json,
    };
}

function createHandler(env) {
    vi.resetModules();
    vi.doMock("../../../src/config/env.js", () => ({
        config: {
            ENVIRONMENT: env,
            JWT_SECRET: "test",
            JWT_EXPIRES_IN: "15m",
            JWT_REFRESH_SECRET: "test",
            JWT_REFRESH_EXPIRES_IN: "7d",
            VAPID_PUBLIC_KEY: "test",
            VAPID_PRIVATE_KEY: "test",
            VAPID_EMAIL: "test@test.com",
            GOOGLE_CLIENT_ID: "",
        },
    }));
    return import("../../../src/middlewares/errorHandler.js").then((m) => m.errorHandler);
}

describe("errorHandler middleware", () => {
    it("responde con el statusCode y mensaje del error", async () => {
        const errorHandler = await createHandler("development");
        const err = new Error("Algo salió mal");
        err.statusCode = 400;
        const req = mockReq();
        const res = mockRes();
        const next = vi.fn();

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.status().json).toHaveBeenCalledWith({
            success: false,
            message: "Algo salió mal",
        });
    });

    it("usa 500 como default si no hay statusCode", async () => {
        const errorHandler = await createHandler("development");
        const err = new Error("Error interno");
        const req = mockReq();
        const res = mockRes();
        const next = vi.fn();

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.status().json).toHaveBeenCalledWith({
            success: false,
            message: "Error interno",
        });
    });

    it("oculta el mensaje real en producción para 500", async () => {
        const errorHandler = await createHandler("production");
        const err = new Error("Detalle sensible");
        err.statusCode = 500;
        const req = mockReq();
        const res = mockRes();
        const next = vi.fn();

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.status().json).toHaveBeenCalledWith({
            success: false,
            message: "Error interno del servidor",
        });
    });

    it("no oculta mensajes que no son 500 en producción", async () => {
        const errorHandler = await createHandler("production");
        const err = new Error("No encontrado");
        err.statusCode = 404;
        const req = mockReq();
        const res = mockRes();
        const next = vi.fn();

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.status().json).toHaveBeenCalledWith({
            success: false,
            message: "No encontrado",
        });
    });
});
