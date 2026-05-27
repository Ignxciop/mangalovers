import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockVerifyIdToken } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
}));

vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn(function () {
    return { verifyIdToken: mockVerifyIdToken };
  }),
}));

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
    },
  },
}));

vi.mock("../../../src/config/emailAllowed.js", () => ({
  validateEmail: vi.fn(() => ({ valid: true })),
}));

vi.mock("../../../src/config/env.js", () => ({
  config: {
    GOOGLE_CLIENT_ID: "test-client-id",
    JWT_SECRET: "test-secret",
    JWT_EXPIRES_IN: "15m",
    JWT_REFRESH_EXPIRES_IN: "7d",
    PORT: 3000,
    ENVIRONMENT: "test",
  },
}));

import { prisma } from "../../../src/config/prisma.js";
import { AuthService } from "../../../src/auth/authService.js";
import { validateEmail } from "../../../src/config/emailAllowed.js";

describe("AuthService.googleLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockReset();
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: "googleuser@gmail.com",
        given_name: "Google",
        family_name: "User",
      }),
    });
  });

  it("loguea usuario existente con Google", async () => {
    const existingUser = {
      id: "user-1", email: "googleuser@gmail.com", name: "Google",
      lastname: "User", role: "USER", status: "ACTIVE", createdAt: new Date(),
    };
    prisma.user.findUnique.mockResolvedValue(existingUser);
    prisma.user.update.mockResolvedValue(existingUser);
    prisma.refreshToken.create.mockResolvedValue({ token: "rt-1" });

    const result = await AuthService.googleLogin("valid-id-token");

    expect(result.user.email).toBe("googleuser@gmail.com");
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBe("rt-1");
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it("crea usuario nuevo si no existe en BD", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: "user-new", email: "googleuser@gmail.com", name: "Google",
      lastname: "User", role: "USER", status: "ACTIVE", createdAt: new Date(),
    });
    prisma.refreshToken.create.mockResolvedValue({ token: "rt-new" });

    const result = await AuthService.googleLogin("valid-id-token");

    expect(result.user.email).toBe("googleuser@gmail.com");
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: "googleuser@gmail.com",
        name: "Google",
        lastname: "User",
        password: "",
      },
      select: expect.any(Object),
    });
  });

  it("lanza ValidationError si Google no devuelve email", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: undefined,
        given_name: "No",
        family_name: "Email",
      }),
    });
    prisma.refreshToken.create.mockResolvedValue({ token: "rt" });

    await expect(AuthService.googleLogin("token-sin-email"))
      .rejects.toThrow("Email requerido de Google");
  });

  it("lanza ValidationError si el email no está en dominio permitido", async () => {
    validateEmail.mockReturnValue({
      valid: false,
      reason: "Solo se permiten correos de Gmail, Outlook, Hotmail o Yahoo",
    });
    prisma.refreshToken.create.mockResolvedValue({ token: "rt" });

    await expect(AuthService.googleLogin("token-dominio-invalido"))
      .rejects.toThrow("Solo se permiten correos de Gmail, Outlook, Hotmail o Yahoo");
  });

  it("lanza error si verifyIdToken falla (token inválido)", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("Invalid token"));

    await expect(AuthService.googleLogin("bad-token"))
      .rejects.toThrow("Invalid token");
  });
});
