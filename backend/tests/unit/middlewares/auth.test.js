import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import { authenticate, optionalAuthenticate } from "../../../src/middlewares/auth.js";
import { config } from "../../../src/config/env.js";

function mockReq(authHeader) {
    return {
        headers: authHeader ? { authorization: authHeader } : {},
    };
}

function mockRes() {
    const json = vi.fn().mockReturnThis();
    return {
        status: vi.fn().mockReturnValue({ json }),
        json,
    };
}

describe("authenticate middleware", () => {
    it("pasa si el token es válido en Authorization header", () => {
        const token = jwt.sign({ userId: "user-123" }, config.JWT_SECRET, {
            expiresIn: "15m",
        });
        const req = mockReq(`Bearer ${token}`);
        const res = mockRes();
        const next = vi.fn();

        authenticate(req, res, next);

        expect(req.user.userId).toBe("user-123");
        expect(next).toHaveBeenCalledOnce();
    });

    it("rechaza con 401 si no hay Authorization header (ignora cookies)", () => {
        const req = mockReq(null);
        const res = mockRes();
        const next = vi.fn();

        authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.status().json).toHaveBeenCalledWith({
            success: false,
            message: "Token no proporcionado",
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("rechaza con 401 si no hay token", () => {
        const req = mockReq(null);
        const res = mockRes();
        const next = vi.fn();

        authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.status().json).toHaveBeenCalledWith({
            success: false,
            message: "Token no proporcionado",
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("rechaza con 401 si el token es inválido", () => {
        const req = mockReq("Bearer token-invalido");
        const res = mockRes();
        const next = vi.fn();

        authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.status().json).toHaveBeenCalledWith({
            success: false,
            message: "Token inválido",
        });
    });
});

describe("optionalAuthenticate middleware", () => {
    it("setea req.user = null si no hay token", () => {
        const req = mockReq(null);
        const res = mockRes();
        const next = vi.fn();

        optionalAuthenticate(req, res, next);

        expect(req.user).toBeNull();
        expect(next).toHaveBeenCalledOnce();
    });

    it("setea req.user si el token es válido", () => {
        const token = jwt.sign({ userId: "user-789" }, config.JWT_SECRET, {
            expiresIn: "15m",
        });
        const req = mockReq(`Bearer ${token}`);
        const res = mockRes();
        const next = vi.fn();

        optionalAuthenticate(req, res, next);

        expect(req.user.userId).toBe("user-789");
        expect(next).toHaveBeenCalledOnce();
    });

    it("setea req.user = null si el token es inválido (no rechaza)", () => {
        const req = mockReq("Bearer token-malo");
        const res = mockRes();
        const next = vi.fn();

        optionalAuthenticate(req, res, next);

        expect(req.user).toBeNull();
        expect(next).toHaveBeenCalledOnce();
    });
});
