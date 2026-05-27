import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    series: {
      findUnique: vi.fn(),
    },
    userFavorite: {
      findUnique: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "../../../src/config/prisma.js";
import { upsertFavorite } from "../../../src/favorite/favoriteService.js";

describe("favoriteService.upsertFavorite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea un nuevo favorito si la serie existe y hay cupo", async () => {
    prisma.series.findUnique.mockResolvedValue({ id: 1 });
    prisma.userFavorite.findUnique.mockResolvedValue(null);
    prisma.userFavorite.count.mockResolvedValue(50);
    prisma.userFavorite.upsert.mockResolvedValue({
      userId: "user-1", seriesId: 1, status: "READING",
    });

    const result = await upsertFavorite("user-1", "1", "READING");

    expect(result.seriesId).toBe(1);
    expect(prisma.userFavorite.upsert).toHaveBeenCalledWith({
      where: { userId_seriesId: { userId: "user-1", seriesId: 1 } },
      update: { status: "READING" },
      create: { userId: "user-1", seriesId: 1, status: "READING" },
    });
  });

  it("actualiza favorito existente sin contar límite", async () => {
    prisma.series.findUnique.mockResolvedValue({ id: 5 });
    prisma.userFavorite.findUnique.mockResolvedValue({ id: "fav-1" });
    prisma.userFavorite.upsert.mockResolvedValue({
      userId: "user-1", seriesId: 5, status: "COMPLETED",
    });

    const result = await upsertFavorite("user-1", "5", "COMPLETED");

    expect(result.status).toBe("COMPLETED");
    expect(prisma.userFavorite.count).not.toHaveBeenCalled();
  });

  it("lanza NotFoundError si la serie no existe", async () => {
    prisma.series.findUnique.mockResolvedValue(null);

    await expect(upsertFavorite("user-1", "999", "READING"))
      .rejects.toThrow("Serie no encontrada");
  });

  it("lanza ValidationError si alcanzó el límite de 200 favoritos", async () => {
    prisma.series.findUnique.mockResolvedValue({ id: 10 });
    prisma.userFavorite.findUnique.mockResolvedValue(null);
    prisma.userFavorite.count.mockResolvedValue(200);

    await expect(upsertFavorite("user-1", "10", "READING"))
      .rejects.toThrow("Máximo de 200 favoritos alcanzado");
  });
});
