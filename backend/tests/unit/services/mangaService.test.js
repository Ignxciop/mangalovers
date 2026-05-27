import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    series: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    chapter: {
      groupBy: vi.fn(),
    },
    userChapterRead: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "../../../src/config/prisma.js";
import { getAllManga } from "../../../src/manga/mangaService.js";

const baseSeries = {
  id: 1, name: "One Piece", slug: "one-piece", cover: "https://example.com/cover.jpg",
  status: "En emisión", chapterCount: 1100, updatedAt: new Date(),
  lastChapterPublishedAt: new Date(), type: "Manga",
  providerSeries: [{ provider: { name: "LectorManga" } }],
};

const baseSeries2 = {
  id: 2, name: "Naruto", slug: "naruto", cover: "https://example.com/naruto.jpg",
  status: "Finalizado", chapterCount: 700, updatedAt: new Date(),
  lastChapterPublishedAt: new Date(), type: "Manga",
  providerSeries: [{ provider: { name: "MangaPlus" } }],
};

describe("mangaService.getAllManga", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna lista paginada sin filtros", async () => {
    prisma.series.findMany.mockResolvedValue([baseSeries, baseSeries2]);
    prisma.chapter.groupBy.mockResolvedValue([
      { seriesId: 1, _max: { number: 1100 } },
      { seriesId: 2, _max: { number: 700 } },
    ]);
    prisma.series.count.mockResolvedValue(2);

    const result = await getAllManga({ page: 1, limit: 24 });

    expect(result.data.length).toBe(2);
    expect(result.meta.total).toBe(2);
    expect(result.data[0].lastChapterNumber).toBe(1100);
    expect(result.data[0].providers).toEqual(["LectorManga"]);
  });

  it("filtra por search", async () => {
    prisma.series.findMany.mockResolvedValue([baseSeries]);
    prisma.chapter.groupBy.mockResolvedValue([{ seriesId: 1, _max: { number: 1100 } }]);
    prisma.series.count.mockResolvedValue(1);

    await getAllManga({ search: "One Piece" });

    expect(prisma.series.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: "One Piece", mode: "insensitive" },
        }),
      }),
    );
  });

  it("filtra por status, provider y type", async () => {
    prisma.series.findMany.mockResolvedValue([baseSeries]);
    prisma.chapter.groupBy.mockResolvedValue([{ seriesId: 1, _max: { number: 1100 } }]);
    prisma.series.count.mockResolvedValue(1);

    await getAllManga({ status: "En emisión", provider: "LectorManga", type: "Manga" });

    const whereArg = prisma.series.findMany.mock.calls[0][0].where;
    expect(whereArg.status).toBe("En emisión");
    expect(whereArg.providerSeries).toBeDefined();
    expect(whereArg.type).toBe("Manga");
  });

  it("filtra por géneros (comma-separated)", async () => {
    prisma.series.findMany.mockResolvedValue([baseSeries]);
    prisma.chapter.groupBy.mockResolvedValue([{ seriesId: 1, _max: { number: 1100 } }]);
    prisma.series.count.mockResolvedValue(1);

    await getAllManga({ genres: "Acción, Aventura" });

    const whereArg = prisma.series.findMany.mock.calls[0][0].where;
    expect(whereArg.genres.some.genre.name.in).toEqual(["Acción", "Aventura"]);
  });

  it("ordena por chapters asc", async () => {
    prisma.series.findMany.mockResolvedValue([baseSeries]);
    prisma.chapter.groupBy.mockResolvedValue([{ seriesId: 1, _max: { number: 1100 } }]);
    prisma.series.count.mockResolvedValue(1);

    await getAllManga({ sort: "chapters", order: "asc" });

    expect(prisma.series.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { chapterCount: "asc" },
      }),
    );
  });

  it("ordena por az / za", async () => {
    prisma.series.findMany.mockResolvedValue([baseSeries]);
    prisma.chapter.groupBy.mockResolvedValue([{ seriesId: 1, _max: { number: 1100 } }]);
    prisma.series.count.mockResolvedValue(1);

    await getAllManga({ sort: "az" });
    let call = prisma.series.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ name: "asc" });

    vi.clearAllMocks();
    prisma.series.findMany.mockResolvedValue([baseSeries]);
    prisma.chapter.groupBy.mockResolvedValue([{ seriesId: 1, _max: { number: 1100 } }]);
    prisma.series.count.mockResolvedValue(1);

    await getAllManga({ sort: "za" });
    call = prisma.series.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ name: "desc" });
  });

  it("incluye lastReadChapterName cuando se pasa userId", async () => {
    prisma.series.findMany.mockResolvedValue([baseSeries, baseSeries2]);
    prisma.chapter.groupBy.mockResolvedValue([
      { seriesId: 1, _max: { number: 1100 } },
      { seriesId: 2, _max: { number: 700 } },
    ]);
    prisma.userChapterRead.findMany.mockResolvedValue([
      { chapter: { seriesId: 1, number: 500 } },
    ]);
    prisma.series.count.mockResolvedValue(2);

    const result = await getAllManga({ page: 1, limit: 24 }, "user-1");

    expect(result.data[0].lastReadChapterName).toBe("500");
    expect(result.data[1].lastReadChapterName).toBeNull();
  });

  it("maneja paginación correctamente", async () => {
    prisma.series.findMany.mockResolvedValue([baseSeries]);
    prisma.chapter.groupBy.mockResolvedValue([{ seriesId: 1, _max: { number: 1100 } }]);
    prisma.series.count.mockResolvedValue(50);

    const result = await getAllManga({ page: 3, limit: 10 });

    expect(prisma.series.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
    expect(result.meta.page).toBe(3);
    expect(result.meta.totalPages).toBe(5);
  });

  it("retorna cover null si la URL no es válida", async () => {
    const invalidCover = { ...baseSeries, cover: "not-a-url" };
    prisma.series.findMany.mockResolvedValue([invalidCover]);
    prisma.chapter.groupBy.mockResolvedValue([{ seriesId: 1, _max: { number: 1100 } }]);
    prisma.series.count.mockResolvedValue(1);

    const result = await getAllManga({ page: 1 });

    expect(result.data[0].cover).toBeNull();
  });
});
