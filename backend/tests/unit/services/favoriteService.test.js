import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    series: { findUnique: vi.fn() },
    userFavorite: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    chapter: { groupBy: vi.fn(), findMany: vi.fn() },
    seriesRelation: { findMany: vi.fn().mockResolvedValue([]) },
    userChapterRead: { findMany: vi.fn() },
  },
}));

vi.mock("../../../src/manga/seriesCluster.js", () => ({
  resolveSeriesCluster: vi.fn(),
  batchResolveFallbackCovers: vi.fn().mockResolvedValue(new Map()),
}));

import { prisma } from "../../../src/config/prisma.js";
import { resolveSeriesCluster } from "../../../src/manga/seriesCluster.js";
import {
  upsertFavorite,
  getFavorite,
  deleteFavorite,
  getUserFavorites,
  getUserFavoritesPaginated,
} from "../../../src/favorite/favoriteService.js";

describe("favoriteService.upsertFavorite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea un nuevo favorito en la primaria del cluster", async () => {
    prisma.series.findUnique.mockResolvedValue({ id: 1 });
    resolveSeriesCluster.mockResolvedValue({ primary: { id: 1 }, allIds: [1, 2] });
    prisma.userFavorite.findUnique.mockResolvedValue(null);
    prisma.userFavorite.count.mockResolvedValue(50);
    prisma.userFavorite.upsert.mockResolvedValue({
      userId: "user-1", seriesId: 1, status: "Siguiendo",
    });

    const result = await upsertFavorite("user-1", "1", "Siguiendo");

    expect(result.seriesId).toBe(1);
    expect(prisma.userFavorite.upsert).toHaveBeenCalledWith({
      where: { userId_seriesId: { userId: "user-1", seriesId: 1 } },
      update: { status: "Siguiendo" },
      create: { userId: "user-1", seriesId: 1, status: "Siguiendo" },
    });
  });

  it("limpia duplicados de otros miembros del cluster", async () => {
    prisma.series.findUnique.mockResolvedValue({ id: 1 });
    resolveSeriesCluster.mockResolvedValue({ primary: { id: 1 }, allIds: [1, 2, 3] });
    prisma.userFavorite.findUnique.mockResolvedValue(null);
    prisma.userFavorite.count.mockResolvedValue(50);
    prisma.userFavorite.upsert.mockResolvedValue({ userId: "u1", seriesId: 1, status: "Siguiendo" });

    await upsertFavorite("u1", "2", "Siguiendo");

    expect(prisma.userFavorite.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", seriesId: { in: [2, 3] } },
    });
  });

  it("actualiza favorito existente sin contar límite", async () => {
    prisma.series.findUnique.mockResolvedValue({ id: 5 });
    resolveSeriesCluster.mockResolvedValue(null);
    prisma.userFavorite.findUnique.mockResolvedValue({ id: "fav-1" });
    prisma.userFavorite.upsert.mockResolvedValue({
      userId: "user-1", seriesId: 5, status: "Terminado",
    });

    const result = await upsertFavorite("user-1", "5", "Terminado");

    expect(result.status).toBe("Terminado");
    expect(prisma.userFavorite.count).not.toHaveBeenCalled();
  });

  it("lanza NotFoundError si la serie no existe", async () => {
    prisma.series.findUnique.mockResolvedValue(null);

    await expect(upsertFavorite("user-1", "999", "Siguiendo"))
      .rejects.toThrow("Serie no encontrada");
  });

  it("lanza ValidationError si alcanzó el límite de 200 favoritos", async () => {
    prisma.series.findUnique.mockResolvedValue({ id: 10 });
    resolveSeriesCluster.mockResolvedValue(null);
    prisma.userFavorite.findUnique.mockResolvedValue(null);
    prisma.userFavorite.count.mockResolvedValue(200);

    await expect(upsertFavorite("user-1", "10", "Siguiendo"))
      .rejects.toThrow("Máximo de 200 favoritos alcanzado");
  });
});

describe("favoriteService.getFavorite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna favorito directo si existe", async () => {
    prisma.userFavorite.findUnique.mockResolvedValueOnce({ id: 1, userId: "u1", seriesId: 1, status: "Siguiendo" });

    const result = await getFavorite("u1", "1");

    expect(result).not.toBeNull();
    expect(result.seriesId).toBe(1);
  });

  it("busca en el cluster si no hay favorito directo", async () => {
    prisma.userFavorite.findUnique
      .mockResolvedValueOnce(null)                              // direct check (seriesId=1)
      .mockResolvedValueOnce({ id: 2, userId: "u1", seriesId: 2, status: "Siguiendo" });  // cluster member 2

    resolveSeriesCluster.mockResolvedValue({ primary: { id: 1 }, allIds: [1, 2] });

    const result = await getFavorite("u1", "1");

    expect(result).not.toBeNull();
    expect(result.seriesId).toBe(2);
  });

  it("retorna null si no hay favorito en todo el cluster", async () => {
    prisma.userFavorite.findUnique.mockResolvedValue(null);
    resolveSeriesCluster.mockResolvedValue({ primary: { id: 1 }, allIds: [1, 2] });

    const result = await getFavorite("u1", "1");

    expect(result).toBeNull();
  });

  it("retorna null si la serie no tiene cluster", async () => {
    prisma.userFavorite.findUnique.mockResolvedValue(null);
    resolveSeriesCluster.mockResolvedValue(null);

    const result = await getFavorite("u1", "999");

    expect(result).toBeNull();
  });
});

describe("favoriteService.deleteFavorite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("elimina favorito de todo el cluster", async () => {
    resolveSeriesCluster.mockResolvedValue({ primary: { id: 1 }, allIds: [1, 2] });
    prisma.userFavorite.deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteFavorite("u1", "1");

    expect(prisma.userFavorite.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", seriesId: { in: [1, 2] } },
    });
  });

  it("lanza NotFoundError si no habia favorito", async () => {
    resolveSeriesCluster.mockResolvedValue(null);
    prisma.userFavorite.deleteMany.mockResolvedValue({ count: 0 });

    await expect(deleteFavorite("u1", "999")).rejects.toThrow("Favorito no encontrado");
  });
});

describe("favoriteService.getUserFavorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deduplica favoritos del mismo cluster", async () => {
    prisma.userFavorite.findMany.mockResolvedValue([
      { userId: "u1", seriesId: 1, status: "Siguiendo", createdAt: new Date(), series: { id: 1, name: "A", slug: "a", cover: null, status: null, type: null, chapterCount: 0, lastChapterPublishedAt: null } },
      { userId: "u1", seriesId: 2, status: "Siguiendo", createdAt: new Date(), series: { id: 2, name: "B", slug: "b", cover: null, status: null, type: null, chapterCount: 0, lastChapterPublishedAt: null } },
    ]);

    resolveSeriesCluster
      .mockResolvedValueOnce({ primary: { id: 1 }, allIds: [1, 2] })
      .mockResolvedValueOnce({ primary: { id: 1 }, allIds: [1, 2] });

    prisma.userChapterRead.findMany.mockResolvedValue([]);
    prisma.chapter.groupBy.mockResolvedValue([]);

    const result = await getUserFavorites("u1");

    expect(result).toHaveLength(1);
    expect(result[0].seriesId).toBe(1);
  });

  it("retorna lista vacia sin favoritos", async () => {
    prisma.userFavorite.findMany.mockResolvedValue([]);

    const result = await getUserFavorites("u1");

    expect(result).toHaveLength(0);
  });
});

describe("favoriteService.getUserFavoritesPaginated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna total normalizado despues de dedup", async () => {
    prisma.userFavorite.findMany.mockResolvedValue([
      { seriesId: 1, series: { id: 1, name: "A", slug: "a", cover: null, status: null, type: null, chapterCount: 0, lastChapterPublishedAt: null } },
      { seriesId: 2, series: { id: 2, name: "B", slug: "b", cover: null, status: null, type: null, chapterCount: 0, lastChapterPublishedAt: null } },
    ]);
    prisma.userFavorite.count.mockResolvedValue(2);

    resolveSeriesCluster
      .mockResolvedValueOnce({ primary: { id: 1 }, allIds: [1, 2] })
      .mockResolvedValueOnce({ primary: { id: 1 }, allIds: [1, 2] });

    prisma.userChapterRead.findMany.mockResolvedValue([]);
    prisma.chapter.groupBy.mockResolvedValue([]);

    const result = await getUserFavoritesPaginated("u1", 1, 10);

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
