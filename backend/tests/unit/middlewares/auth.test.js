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
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe("authenticate middleware", () => {
  it("pasa si el token es válido en Authorization header", async () => {
    const token = jwt.sign({ userId: "user-123" }, config.JWT_SECRET, { expiresIn: "15m" });
    const req = mockReq(`Bearer ${token}`);
    const res = mockRes();
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(req.user.userId).toBe("user-123");
    expect(next).toHaveBeenCalledOnce();
  });

  it("rechaza con 401 si no hay Authorization header", async () => {
    const req = mockReq(null);
    const res = mockRes();
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("Token no proporcionado");
  });

  it("rechaza con 401 si el token es inválido", async () => {
    const req = mockReq("Bearer token-invalido");
    const res = mockRes();
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/Token inválido o expirado/i);
  });
});

describe("optionalAuthenticate middleware", () => {
  it("setea req.user = null si no hay token", async () => {
    const req = mockReq(null);
    const res = mockRes();
    const next = vi.fn();

    await optionalAuthenticate(req, res, next);

    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalledOnce();
  });

  it("setea req.user si el token es válido", async () => {
    const token = jwt.sign({ userId: "user-789" }, config.JWT_SECRET, { expiresIn: "15m" });
    const req = mockReq(`Bearer ${token}`);
    const res = mockRes();
    const next = vi.fn();

    await optionalAuthenticate(req, res, next);

    expect(req.user.userId).toBe("user-789");
    expect(next).toHaveBeenCalledOnce();
  });

  it("setea req.user = null si el token es inválido (no rechaza)", async () => {
    const req = mockReq("Bearer token-malo");
    const res = mockRes();
    const next = vi.fn();

    await optionalAuthenticate(req, res, next);

    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalledOnce();
  });
});
