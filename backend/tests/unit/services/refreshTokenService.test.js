import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    refreshToken: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../../../src/config/prisma.js";
import { RefreshTokenService } from "../../../src/auth/refreshTokenService.js";

function makeToken(overrides = {}) {
  return {
    token: "valid-token",
    userId: "user-1",
    expiresAt: new Date(Date.now() + 86400000),
    isRevoked: false,
    replacedBy: null,
    user: {
      id: "user-1", email: "test@gmail.com", name: "Test", lastname: "User",
      role: "USER", password: "hash", createdAt: new Date(), updatedAt: new Date(),
    },
    ...overrides,
  };
}

describe("RefreshTokenService.validateRefreshToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve el token si es válido", async () => {
    const token = makeToken();
    prisma.refreshToken.findUnique.mockResolvedValue(token);

    const result = await RefreshTokenService.validateRefreshToken("valid-token");

    expect(result.token).toBe("valid-token");
    expect(result.user.email).toBe("test@gmail.com");
    expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
      where: { token: "valid-token" },
      include: expect.any(Object),
    });
  });

  it("lanza UnauthorizedError si el token no existe", async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(null);

    await expect(RefreshTokenService.validateRefreshToken("no-existe"))
      .rejects.toThrow("Refresh token inválido");
  });

  it("lanza UnauthorizedError y revoca si el token expiró", async () => {
    const token = makeToken({ expiresAt: new Date(Date.now() - 86400000) });
    prisma.refreshToken.findUnique.mockResolvedValue(token);
    prisma.refreshToken.update.mockResolvedValue(token);

    await expect(RefreshTokenService.validateRefreshToken("expired-token"))
      .rejects.toThrow("Refresh token expirado");

    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { token: "expired-token" },
      data: { isRevoked: true, replacedBy: null },
    });
  });

  it("lanza UnauthorizedError si el token está revocado", async () => {
    const token = makeToken({ isRevoked: true });
    prisma.refreshToken.findUnique.mockResolvedValue(token);

    await expect(RefreshTokenService.validateRefreshToken("revoked-token"))
      .rejects.toThrow("Refresh token revocado");
  });
});
