import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    series: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    chapter: {
      groupBy: vi.fn(),
      findFirst: vi.fn(),
    },
    userChapterRead: {
      findMany: vi.fn(),
    },
    seriesRelation: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("../../../src/manga/seriesCluster.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    resolveSeriesCluster: vi.fn(),
  };
});

import { prisma } from "../../../src/config/prisma.js";
import { getAllManga, getChapterPages } from "../../../src/manga/mangaService.js";
import { resolveSeriesCluster } from "../../../src/manga/seriesCluster.js";

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

  it("excluye géneros (comma-separated)", async () => {
    prisma.series.findMany.mockResolvedValue([baseSeries]);
    prisma.chapter.groupBy.mockResolvedValue([{ seriesId: 1, _max: { number: 1100 } }]);
    prisma.series.count.mockResolvedValue(1);

    await getAllManga({ excludeGenres: "Romance, Drama" });

    const whereArg = prisma.series.findMany.mock.calls[0][0].where;
    expect(whereArg.AND[0].genres.none.genre.name.in).toEqual(["Romance", "Drama"]);
  });

  it("combina géneros incluidos y excluidos", async () => {
    prisma.series.findMany.mockResolvedValue([baseSeries]);
    prisma.chapter.groupBy.mockResolvedValue([{ seriesId: 1, _max: { number: 1100 } }]);
    prisma.series.count.mockResolvedValue(1);

    await getAllManga({ genres: "Acción", excludeGenres: "Romance" });

    const whereArg = prisma.series.findMany.mock.calls[0][0].where;
    expect(whereArg.genres.some.genre.name.in).toEqual(["Acción"]);
    expect(whereArg.AND[0].genres.none.genre.name.in).toEqual(["Romance"]);
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

    const pagCall = prisma.series.findMany.mock.calls[0][0];
    expect(pagCall.skip).toBe(20);
    // take es limit*3 por over-fetch para dedup, luego se slicea internamente
    expect(pagCall.take).toBe(30);
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

describe("mangaService.getChapterPages", () => {
  const primarySeries = { id: 1, name: "Primary", slug: "primary" };

  // Dataset simulado por test (recreado en beforeEach): capítulos por
  // seriesId y number. primary: #44(id11), #45(id12), #46(id13);
  // fallback: #44(id21), #45(id22), #46(id23).
  let chaptersBySeries;

  function mockChapterFindFirst() {
    prisma.chapter.findFirst.mockImplementation(({ where }) => {
      // Capítulo actual (lookup por id)
      if (where.id !== undefined) {
        const entry = chaptersBySeries[1][45];
        return {
          ...entry,
          number: 45,
          seriesId: 1,
          publishedAt: new Date(),
          pages: [],
          series: primarySeries,
        };
      }

      // findFallbackChapter: sin capítulos con páginas en fallback
      if (where.pages) return null;

      // Closest number (prev/next)
      if (where.number && typeof where.number === "object") {
        const { lt, gt } = where.number;
        const allNumbers = [44, 45, 46];
        if (lt !== undefined) return { number: Math.max(...allNumbers.filter((n) => n < lt)) };
        return { number: Math.min(...allNumbers.filter((n) => n > gt)) };
      }

      // Lookup exacto por seriesId + number (primary o fallback)
      const ids = Array.isArray(where.seriesId.in) ? where.seriesId.in : [where.seriesId];
      for (const sid of ids) {
        const entry = chaptersBySeries[sid]?.[where.number];
        if (entry) return entry;
      }
      return null;
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    chaptersBySeries = {
      1: { 44: { id: 11, name: "44" }, 45: { id: 12, name: "45" }, 46: { id: 13, name: "46" } },
      2: { 44: { id: 21, name: "44" }, 45: { id: 22, name: "45" }, 46: { id: 23, name: "46" } },
    };
    prisma.series.findUnique.mockResolvedValue({ id: 1 });
    resolveSeriesCluster.mockResolvedValue({
      primary: { id: 1 },
      allIds: [1, 2],
      fallbacks: [{ id: 2 }],
    });
    mockChapterFindFirst();
  });

  it("prev/next devuelven el id del primary cuando ambos providers tienen el mismo number", async () => {
    const result = await getChapterPages("primary", "12");

    expect(result.prev).toEqual({ id: 11, name: "44" });
    expect(result.next).toEqual({ id: 13, name: "46" });
  });

  it("next cae al fallback cuando el primary no tiene ese number (hueco real)", async () => {
    // Simular hueco: el primary NO tiene #46
    delete chaptersBySeries[1][46];

    const result = await getChapterPages("primary", "12");

    expect(result.next).toEqual({ id: 23, name: "46" });
    expect(result.prev).toEqual({ id: 11, name: "44" });
  });

  it("resuelve prev/next sin cluster usando el propio series.id como primary", async () => {
    resolveSeriesCluster.mockResolvedValue(null);
    delete chaptersBySeries[2][44];
    delete chaptersBySeries[2][45];
    delete chaptersBySeries[2][46];

    const result = await getChapterPages("primary", "12");

    expect(result.prev).toEqual({ id: 11, name: "44" });
    expect(result.next).toEqual({ id: 13, name: "46" });
  });
});
