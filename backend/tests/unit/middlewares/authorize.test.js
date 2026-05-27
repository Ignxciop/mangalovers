import { describe, it, expect, vi } from "vitest";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { authorize } from "../../../src/middlewares/authorize.js";
import { prisma } from "../../../src/config/prisma.js";

function mockReq(user) {
  return {
    user: user ? { userId: user.id, role: user.role } : null,
  };
}

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe("authorize middleware", () => {
  it("llama next si el usuario tiene el rol permitido", async () => {
    const req = mockReq({ id: "user-1", role: "ADMIN" });
    const res = mockRes();
    const next = vi.fn();

    prisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });

    const middleware = authorize("ADMIN");
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("rechaza con 401 si el usuario no tiene el rol permitido", async () => {
    const req = mockReq({ id: "user-2", role: "USER" });
    const res = mockRes();
    const next = vi.fn();

    prisma.user.findUnique.mockResolvedValue({ role: "USER" });

    const middleware = authorize("ADMIN");
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("No tienes permisos para realizar esta acción");
  });

  it("rechaza con 401 si req.user es null", async () => {
    const req = mockReq(null);
    const res = mockRes();
    const next = vi.fn();

    const middleware = authorize("ADMIN");
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("No autenticado");
  });

  it("rechaza con 401 si el usuario no existe en DB", async () => {
    const req = mockReq({ id: "non-existent", role: "ADMIN" });
    const res = mockRes();
    const next = vi.fn();

    prisma.user.findUnique.mockResolvedValue(null);

    const middleware = authorize("ADMIN");
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });
});
