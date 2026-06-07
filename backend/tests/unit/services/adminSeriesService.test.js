import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockFindMany, mockFindFirst, mockCount, mockCreate, mockUpdate, mockUpsert, mockDelete, mockDeleteMany } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindFirst: vi.fn(),
  mockCount: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpsert: vi.fn(),
  mockDelete: vi.fn(),
  mockDeleteMany: vi.fn(),
}));

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    series: { findUnique: mockFindUnique, findMany: mockFindMany, count: mockCount, update: mockUpdate },
    provider: { findUnique: mockFindUnique, findMany: mockFindMany },
    seriesRelation: { findUnique: mockFindUnique, create: mockCreate, delete: mockDelete },
    seriesAlias: { findUnique: mockFindUnique, upsert: mockUpsert, delete: mockDelete },
    userFavorite: { findMany: mockFindMany, upsert: mockUpsert, deleteMany: mockDeleteMany, count: mockCount },
    userChapterRead: { findMany: mockFindMany, upsert: mockUpsert, deleteMany: mockDeleteMany },
    userChapterProgress: { findMany: mockFindMany, upsert: mockUpsert, deleteMany: mockDeleteMany },
    chapter: { findMany: mockFindMany },
    providerSeries: { findFirst: mockFindFirst },
    $transaction: vi.fn(),
    scraperRun: { findMany: mockFindMany },
    providerSeries: { groupBy: vi.fn() },
    provider: { findMany: mockFindMany },
  },
}));

vi.mock("../../../src/config/logger.js", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("../../../src/notifications/notificationService.js", () => ({ createNotification: vi.fn().mockResolvedValue() }));
vi.mock("../../../src/manga/scrapers/duplicateSeries.js", () => ({ mergeSeries: vi.fn() }));

import { prisma } from "../../../src/config/prisma.js";
import { AdminSeriesService } from "../../../src/admin/adminSeriesService.js";

describe("AdminSeriesService.listSeries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna lista paginada sin filtros", async () => {
    mockFindMany.mockResolvedValueOnce([{ id: 1, name: "Test", providerSeries: [], primaryRelations: [], fallbackRelations: [], _count: { chapters: 5 } }]);
    mockCount.mockResolvedValueOnce(1);

    const result = await AdminSeriesService.listSeries({ page: 1, limit: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
  });

  it("filtra por search", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    await AdminSeriesService.listSeries({ search: "One Piece" });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: "One Piece", mode: "insensitive" },
        }),
      }),
    );
  });

  it("filtra por provider", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    await AdminSeriesService.listSeries({ provider: "olympus" });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          providerSeries: { some: { provider: { name: "olympus" } } },
        }),
      }),
    );
  });
});

describe("AdminSeriesService.getSeries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna serie por id", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 1, name: "Test", providerSeries: [], primaryRelations: [], fallbackRelations: [], aliases: [], _count: { chapters: 5 } });

    const result = await AdminSeriesService.getSeries(1);

    expect(result.id).toBe(1);
  });

  it("lanza 404 si no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    await expect(AdminSeriesService.getSeries(999)).rejects.toThrow("Serie no encontrada");
  });
});

describe("AdminSeriesService.createRelation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lanza 400 si primary y fallback son iguales", async () => {
    await expect(AdminSeriesService.createRelation(1, 1)).rejects.toThrow("No se puede crear relación");
  });

  it("lanza 409 si la relacion ya existe", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 1 });

    await expect(AdminSeriesService.createRelation(1, 2)).rejects.toThrow("La relación ya existe");
  });

  it("crea relacion y migra favoritos/lecturas/progreso del fallback al primary", async () => {
    const tx = {
      seriesRelation: { create: vi.fn().mockResolvedValue({ id: 1 }) },
      userFavorite: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
      userChapterRead: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
      userChapterProgress: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
      chapter: { findMany: vi.fn() },
    };

    mockFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, name: "Primary" });

    tx.userFavorite.findMany.mockResolvedValue([
      { userId: "u1", status: "Siguiendo" },
    ]);
    tx.chapter.findMany.mockResolvedValue([
      { id: 10, name: "1" },
      { id: 11, name: "2" },
    ]);
    tx.chapter.findMany.mockResolvedValueOnce([
      { id: 10, name: "1" },
      { id: 11, name: "2" },
    ]);
    tx.chapter.findMany.mockResolvedValueOnce([
      { id: 100, name: "1" },
      { id: 101, name: "2" },
    ]);
    tx.userChapterRead.findMany.mockResolvedValue([
      { userId: "u1", chapterId: 10 },
    ]);
    tx.userChapterProgress.findMany.mockResolvedValue([
      { userId: "u1", chapterId: 10, pageNumber: 5, percentage: 50 },
    ]);

    prisma.$transaction.mockImplementation(async (cb) => cb(tx));

    mockFindUnique.mockReset();
    mockFindUnique
      .mockResolvedValueOnce(null)  // existing check
      .mockResolvedValueOnce({ id: 1, name: "Primary" });  // series info

    const result = await AdminSeriesService.createRelation(1, 2);

    expect(result).toBeDefined();
    expect(tx.userFavorite.upsert).toHaveBeenCalled();
    expect(tx.userChapterRead.upsert).toHaveBeenCalled();
    expect(tx.userChapterProgress.upsert).toHaveBeenCalled();
    expect(tx.userFavorite.deleteMany).not.toHaveBeenCalled();
    expect(tx.userChapterRead.deleteMany).not.toHaveBeenCalled();
    expect(tx.userChapterProgress.deleteMany).not.toHaveBeenCalled();
  });

  it("no migra lecturas si los nombres de capitulos no coinciden", async () => {
    const tx = {
      seriesRelation: { create: vi.fn().mockResolvedValue({ id: 1 }) },
      userFavorite: { findMany: vi.fn().mockResolvedValue([]), upsert: vi.fn(), deleteMany: vi.fn() },
      userChapterRead: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
      userChapterProgress: { findMany: vi.fn().mockResolvedValue([]), upsert: vi.fn(), deleteMany: vi.fn() },
      chapter: { findMany: vi.fn() },
    };

    tx.chapter.findMany
      .mockResolvedValueOnce([{ id: 10, name: "Capítulo 1" }, { id: 11, name: "Capítulo 2" }])
      .mockResolvedValueOnce([{ id: 100, name: "1" }, { id: 101, name: "2" }]);

    tx.userChapterRead.findMany.mockResolvedValue([
      { userId: "u1", chapterId: 10 },
    ]);

    prisma.$transaction.mockImplementation(async (cb) => cb(tx));

    mockFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, name: "Primary" });

    await AdminSeriesService.createRelation(1, 2);

    expect(tx.userChapterRead.upsert).not.toHaveBeenCalled();
  });
});

describe("AdminSeriesService.deleteRelation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lanza 404 si la relacion no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    await expect(AdminSeriesService.deleteRelation(999)).rejects.toThrow("Relación no encontrada");
  });

  it("elimina relacion existente", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 1, primarySeriesId: 1, fallbackSeriesId: 2 });

    await AdminSeriesService.deleteRelation(1);

    expect(mockDelete).toHaveBeenCalled();
  });
});

describe("AdminSeriesService.addAlias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lanza 400 si el alias esta vacio", async () => {
    await expect(AdminSeriesService.addAlias(1, "  ")).rejects.toThrow("vacío");
  });

  it("lanza 409 si el alias ya esta asignado a otra serie", async () => {
    mockFindUnique.mockResolvedValueOnce({ seriesId: 2 });

    await expect(AdminSeriesService.addAlias(1, "test")).rejects.toThrow("ya está asignado");
  });

  it("crea alias si no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockUpsert.mockResolvedValueOnce({ id: 1, seriesId: 1, alias: "test alias" });

    const result = await AdminSeriesService.addAlias(1, "Test Alias");

    expect(result.alias).toBe("test alias");
  });
});

describe("AdminSeriesService.toggleVisibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lanza 404 si la serie no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    await expect(AdminSeriesService.toggleVisibility(999)).rejects.toThrow("Serie no encontrada");
  });

  it("cambia visibilidad de true a false", async () => {
    mockFindUnique.mockResolvedValueOnce({ visible: true });
    mockUpdate.mockResolvedValueOnce({ id: 1, visible: false });

    const result = await AdminSeriesService.toggleVisibility(1);

    expect(result.visible).toBe(false);
  });

  it("cambia visibilidad de false a true", async () => {
    mockFindUnique.mockResolvedValueOnce({ visible: false });
    mockUpdate.mockResolvedValueOnce({ id: 1, visible: true });

    const result = await AdminSeriesService.toggleVisibility(1);

    expect(result.visible).toBe(true);
  });
});

describe("AdminSeriesService.deleteAlias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lanza 404 si el alias no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    await expect(AdminSeriesService.deleteAlias(999)).rejects.toThrow("Alias no encontrado");
  });

  it("elimina alias existente", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 1 });

    await AdminSeriesService.deleteAlias(1);

    expect(mockDelete).toHaveBeenCalled();
  });
});
