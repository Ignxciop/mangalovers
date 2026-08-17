import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    series: { findUnique: vi.fn(), findMany: vi.fn() },
    userChapterRead: { findMany: vi.fn(), findUnique: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
    userChapterProgress: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
    userFavorite: { findMany: vi.fn() },
    chapter: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), groupBy: vi.fn() },
    seriesRelation: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("../../../src/manga/seriesCluster.js", () => ({
  resolveSeriesCluster: vi.fn(),
  batchResolveFallbackCovers: vi.fn().mockResolvedValue(new Map()),
}));

import { prisma } from "../../../src/config/prisma.js";
import { resolveSeriesCluster } from "../../../src/manga/seriesCluster.js";
import { getZonedParts } from "../../../src/utils/time.js";
import {
  getReadChapterIds,
  toggleChapterRead,
  markChaptersUntil,
  unmarkChaptersFrom,
  getFullStats,
  upsertChapterProgress,
  getChapterProgress,
  getSeriesProgress,
} from "../../../src/read/readService.js";

function makeRead(seriesId, number, daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    createdAt: d,
    chapter: { seriesId, name: String(number), number },
  };
}

function makeFavorite(seriesId, overrides = {}) {
  return {
    seriesId,
    series: {
      id: seriesId, name: `Series ${seriesId}`, slug: `series-${seriesId}`,
      cover: null, chapterCount: 100, status: "En emisión",
      ...overrides,
    },
  };
}

describe("readService.getFullStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna stats vacías cuando no hay lecturas ni favoritos", async () => {
    prisma.userChapterRead.findMany.mockResolvedValue([]);
    prisma.userFavorite.findMany.mockResolvedValue([]);

    const result = await getFullStats("user-empty");

    expect(result.totalChaptersRead).toBe(0);
    expect(result.totalSeries).toBe(0);
    expect(result.startedSeries).toBe(0);
    expect(result.completedSeries).toBe(0);
    expect(result.completionRate).toBe(0);
    expect(result.topGenre).toBeNull();
    expect(result.topGenres).toEqual([]);
    expect(result.mostActiveDay).toBe("Domingo");
    expect(result.activityByDay).toHaveLength(7);
    expect(result.currentStreak).toBe(0);
    expect(result.bestStreak).toBe(0);
    expect(result.activityLast30).toHaveLength(30);
    expect(result.activityLast30.every((d) => d.count === 0)).toBe(true);
    expect(result.monthlyActivity).toHaveLength(6);
    expect(result.topSeries).toEqual([]);
    expect(result.firstReadDate).toBeNull();
    expect(result.avgChaptersPerDay).toBe(0);
    expect(result.totalActiveDays).toBe(0);
  });

  it("calcula streaks correctamente con lecturas consecutivas", async () => {
    const reads = [
      makeRead(1, 10, 0),   // today
      makeRead(1, 9, 1),    // yesterday
      makeRead(1, 8, 2),    // 2 days ago
      makeRead(1, 7, 3),    // 3 days ago
    ];
    prisma.userChapterRead.findMany.mockResolvedValue(reads);
    prisma.userFavorite.findMany.mockResolvedValue([makeFavorite(1)]);
    prisma.chapter.groupBy.mockResolvedValue([{ seriesId: 1, _max: { number: 10 } }]);
    prisma.series.findMany.mockResolvedValue([{
      id: 1, name: "Series 1", slug: "series-1", cover: null,
      chapterCount: 100, genres: [{ genre: { name: "Acción" } }],
    }]);

    const result = await getFullStats("user-streak");

    expect(result.currentStreak).toBe(4);
    expect(result.bestStreak).toBeGreaterThanOrEqual(4);
    expect(result.totalActiveDays).toBe(4);
  });

  it("calcula topGenres basado en géneros de series leídas", async () => {
    const reads = [
      makeRead(1, 1, 0),
      makeRead(2, 1, 0),
      makeRead(3, 1, 0),
    ];
    prisma.userChapterRead.findMany.mockResolvedValue(reads);
    prisma.userFavorite.findMany.mockResolvedValue([
      makeFavorite(1), makeFavorite(2), makeFavorite(3),
    ]);
    prisma.chapter.groupBy.mockResolvedValue([
      { seriesId: 1, _max: { number: 50 } },
      { seriesId: 2, _max: { number: 50 } },
      { seriesId: 3, _max: { number: 50 } },
    ]);
    prisma.series.findMany.mockResolvedValue([
      { id: 1, name: "Series 1", slug: "series-1", cover: null, chapterCount: 100,
        genres: [{ genre: { name: "Acción" } }, { genre: { name: "Aventura" } }] },
      { id: 2, name: "Series 2", slug: "series-2", cover: null, chapterCount: 100,
        genres: [{ genre: { name: "Acción" } }] },
      { id: 3, name: "Series 3", slug: "series-3", cover: null, chapterCount: 100,
        genres: [{ genre: { name: "Comedia" } }] },
    ]);

    const result = await getFullStats("user-genres");

    expect(result.topGenres[0].name).toBe("Acción");
    expect(result.topGenres[0].count).toBe(2);
    expect(result.topGenres[1].name).toBe("Aventura");
    expect(result.topGenres[2].name).toBe("Comedia");
    expect(result.topGenre).toBe("Acción");
  });

  it("calcula completionRate correctamente", async () => {
    const reads = [
      makeRead(1, 100, 0),  // completed (lastAvail = 100)
      makeRead(2, 30, 0),   // not completed (lastAvail = 50)
    ];
    prisma.userChapterRead.findMany.mockResolvedValue(reads);
    prisma.userFavorite.findMany.mockResolvedValue([
      makeFavorite(1), makeFavorite(2),
    ]);
    prisma.chapter.groupBy.mockResolvedValue([
      { seriesId: 1, _max: { number: 100 } },
      { seriesId: 2, _max: { number: 50 } },
    ]);
    prisma.series.findMany.mockResolvedValue([
      { id: 1, name: "Series 1", slug: "series-1", cover: null, chapterCount: 100,
        genres: [{ genre: { name: "Acción" } }] },
      { id: 2, name: "Series 2", slug: "series-2", cover: null, chapterCount: 100,
        genres: [{ genre: { name: "Aventura" } }] },
    ]);

    const result = await getFullStats("user-completion");

    expect(result.startedSeries).toBe(2);
    expect(result.completedSeries).toBe(1);
    expect(result.completionRate).toBe(50);
    expect(result.totalSeries).toBe(2);
  });

  it("calcula activityByDay correctamente", async () => {
    const today = new Date();
    const dayOfWeek = getZonedParts(today).weekday;
    const reads = [makeRead(1, 1, 0)];
    // Force createdAt to today's date
    reads[0].createdAt = today;

    prisma.userChapterRead.findMany.mockResolvedValue(reads);
    prisma.userFavorite.findMany.mockResolvedValue([makeFavorite(1)]);
    prisma.chapter.groupBy.mockResolvedValue([{ seriesId: 1, _max: { number: 50 } }]);
    prisma.series.findMany.mockResolvedValue([{
      id: 1, name: "Series 1", slug: "series-1", cover: null,
      chapterCount: 100, genres: [{ genre: { name: "Acción" } }],
    }]);

    const result = await getFullStats("user-day");

    // The day that has count 1 should match today's day name (abbreviated, first 3 chars)
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const todayAbbr = dayNames[dayOfWeek];
    const activeDay = result.activityByDay.find((d) => d.count > 0);
    expect(activeDay).toBeDefined();
    expect(activeDay.name).toBe(todayAbbr);
    expect(activeDay.count).toBe(1);
  });

  it("calcula topSeries por cantidad de capítulos leídos", async () => {
    const reads = [
      makeRead(1, 1, 0), makeRead(1, 2, 0), makeRead(1, 3, 0),
      makeRead(2, 1, 0),
    ];
    prisma.userChapterRead.findMany.mockResolvedValue(reads);
    prisma.userFavorite.findMany.mockResolvedValue([
      makeFavorite(1), makeFavorite(2),
    ]);
    prisma.chapter.groupBy.mockResolvedValue([
      { seriesId: 1, _max: { number: 100 } },
      { seriesId: 2, _max: { number: 50 } },
    ]);
    prisma.series.findMany.mockResolvedValue([
      { id: 1, name: "Series 1", slug: "series-1", cover: null, chapterCount: 100,
        genres: [{ genre: { name: "Acción" } }] },
      { id: 2, name: "Series 2", slug: "series-2", cover: null, chapterCount: 100,
        genres: [{ genre: { name: "Aventura" } }] },
    ]);

    const result = await getFullStats("user-topseries");

    expect(result.topSeries[0].name).toBe("Series 1");
    expect(result.topSeries[0].chaptersRead).toBe(3);
    expect(result.topSeries[1].name).toBe("Series 2");
    expect(result.topSeries[1].chaptersRead).toBe(1);
  });

  it("retorna totalPagesEstimated y estimatedHours", async () => {
    const reads = Array.from({ length: 10 }, (_, i) => makeRead(1, i + 1, i));
    prisma.userChapterRead.findMany.mockResolvedValue(reads);
    prisma.userFavorite.findMany.mockResolvedValue([makeFavorite(1)]);
    prisma.chapter.groupBy.mockResolvedValue([{ seriesId: 1, _max: { number: 100 } }]);
    prisma.series.findMany.mockResolvedValue([{
      id: 1, name: "Series 1", slug: "series-1", cover: null,
      chapterCount: 100, genres: [{ genre: { name: "Acción" } }],
    }]);

    const result = await getFullStats("user-stats");

    expect(result.totalChaptersRead).toBe(10);
    expect(result.totalPagesEstimated).toBe(200);  // 10 * 20
    expect(result.estimatedHours).toBe(1);           // round(10 * 7 / 60) = 1
  });

  it("incluye firstReadDate correctamente", async () => {
    prisma.userChapterRead.findMany.mockResolvedValue([makeRead(1, 1, 0)]);
    prisma.userFavorite.findMany.mockResolvedValue([makeFavorite(1)]);
    prisma.chapter.groupBy.mockResolvedValue([{ seriesId: 1, _max: { number: 100 } }]);
    prisma.series.findMany.mockResolvedValue([{
      id: 1, name: "Series 1", slug: "series-1", cover: null,
      chapterCount: 100, genres: [{ genre: { name: "Acción" } }],
    }]);

    const result = await getFullStats("user-firstread");

    expect(result.firstReadDate).toBeDefined();
    expect(result.totalChaptersRead).toBe(1);
  });
});

describe("readService.getReadChapterIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna chapterIds de la serie", async () => {
    prisma.series.findUnique.mockResolvedValue({ id: 1 });
    resolveSeriesCluster.mockResolvedValue(null);
    prisma.userChapterRead.findMany.mockResolvedValue([
      { chapterId: 10, chapter: { number: 5 } },
      { chapterId: 11, chapter: { number: 6 } },
    ]);

    const result = await getReadChapterIds("u1", "1");

    expect(result).toEqual([10, 11]);
  });

  it("incluye lecturas de todos los miembros del cluster", async () => {
    prisma.series.findUnique.mockResolvedValue({ id: 1 });
    resolveSeriesCluster.mockResolvedValue({ primary: { id: 1 }, allIds: [1, 2] });
    prisma.userChapterRead.findMany.mockResolvedValue([
      { chapterId: 10, chapter: { number: 5 } },
      { chapterId: 20, chapter: { number: 6 } },
    ]);
    prisma.chapter.findMany.mockResolvedValue([
      { id: 10, name: "5", number: 5 },
      { id: 20, name: "6", number: 6 },
    ]);

    const result = await getReadChapterIds("u1", "1");

    expect(prisma.userChapterRead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1", chapter: { seriesId: { in: [1, 2] } } },
      }),
    );
    expect(result).toEqual([10, 20]);
  });

  it("lanza NotFoundError si la serie no existe", async () => {
    prisma.series.findUnique.mockResolvedValue(null);

    await expect(getReadChapterIds("u1", "999")).rejects.toThrow("Serie no encontrada");
  });

  it("propaga lecturas por nombre exacto en el cluster", async () => {
    prisma.series.findUnique.mockResolvedValue({ id: 1 });
    resolveSeriesCluster.mockResolvedValue({ primary: { id: 1 }, allIds: [1, 2] });
    // Usuario leyó capítulo en fallback (seriesId=2)
    prisma.userChapterRead.findMany.mockResolvedValue([
      { chapterId: 20, chapter: { number: 5 } },
    ]);
    // Mismo nombre "5" en primary (id=10) y fallback (id=20)
    prisma.chapter.findMany.mockResolvedValue([
      { id: 10, name: "5", number: 5 },   // primary
      { id: 20, name: "5", number: 5 },   // fallback (leído)
    ]);

    const result = await getReadChapterIds("u1", "1");

    // Ambos deben estar marcados como leídos (propagación por nombre)
    expect(result).toEqual(expect.arrayContaining([10, 20]));
  });

  it("propaga lecturas por número en el cluster", async () => {
    prisma.series.findUnique.mockResolvedValue({ id: 1 });
    resolveSeriesCluster.mockResolvedValue({ primary: { id: 1 }, allIds: [1, 2] });
    // Usuario leyó capítulo 30 en el primary
    prisma.userChapterRead.findMany.mockResolvedValue([
      { chapterId: 30, chapter: { number: 30 } },
    ]);
    // Capítulos: primary tiene 30, fallback tiene 10 (mismatched name)
    prisma.chapter.findMany.mockResolvedValue([
      { id: 30, name: "30", number: 30 },  // primary (leído)
      { id: 10, name: "10,2", number: 10.2 }, // fallback sin match
    ]);

    const result = await getReadChapterIds("u1", "1");

    // El capítulo 10 del fallback debe estar marcado como leído (10.2 ≤ 30)
    expect(result).toEqual(expect.arrayContaining([30, 10]));
  });

  it("no propaga lecturas si el cluster tiene un solo miembro", async () => {
    prisma.series.findUnique.mockResolvedValue({ id: 1 });
    resolveSeriesCluster.mockResolvedValue({ primary: { id: 1 }, allIds: [1] });
    prisma.userChapterRead.findMany.mockResolvedValue([
      { chapterId: 10, chapter: { number: 5 } },
    ]);

    const result = await getReadChapterIds("u1", "1");

    expect(result).toEqual([10]);
  });
});

describe("readService.markChaptersUntil", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marca capitulos hasta el numero dado", async () => {
    prisma.chapter.findUnique.mockResolvedValue({ seriesId: 1, number: 5 });
    prisma.chapter.findMany.mockResolvedValue([
      { id: 1, name: "1" },
      { id: 2, name: "2" },
      { id: 3, name: "3" },
      { id: 4, name: "4" },
      { id: 5, name: "5" },
    ]);
    prisma.series.findUnique.mockResolvedValue({ name: "Test Series" });
    prisma.userChapterRead.findMany.mockResolvedValue([{ chapterId: 1 }]);

    const result = await markChaptersUntil("u1", 5);

    expect(result.updated).toBe(5);
    expect(prisma.userChapterRead.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        { userId: "u1", chapterId: 2 },
        { userId: "u1", chapterId: 3 },
        { userId: "u1", chapterId: 4 },
        { userId: "u1", chapterId: 5 },
      ]),
      skipDuplicates: true,
    });
  });

  it("no crea duplicados si ya estaban marcados", async () => {
    prisma.chapter.findUnique.mockResolvedValue({ seriesId: 1, number: 3 });
    prisma.chapter.findMany.mockResolvedValue([
      { id: 1, name: "1" },
      { id: 2, name: "2" },
      { id: 3, name: "3" },
    ]);
    prisma.series.findUnique.mockResolvedValue({ name: "Test" });
    prisma.userChapterRead.findMany.mockResolvedValue([
      { chapterId: 1 },
      { chapterId: 2 },
      { chapterId: 3 },
    ]);

    const result = await markChaptersUntil("u1", 3);

    expect(result.newChapters).toHaveLength(0);
    expect(prisma.userChapterRead.createMany).not.toHaveBeenCalled();
  });
});

describe("readService.unmarkChaptersFrom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("desmarca capitulos desde el numero dado", async () => {
    prisma.chapter.findUnique.mockResolvedValue({ seriesId: 1, number: 3 });
    prisma.chapter.findMany.mockResolvedValue([
      { id: 3 },
      { id: 4 },
      { id: 5 },
    ]);

    const result = await unmarkChaptersFrom("u1", 3);

    expect(prisma.userChapterRead.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", chapterId: { in: [3, 4, 5] } },
    });
  });
});

describe("readService.toggleChapterRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marca hasta el capitulo si no existe lectura", async () => {
    prisma.userChapterRead.findUnique.mockResolvedValue(null);
    prisma.chapter.findUnique.mockResolvedValue({ seriesId: 1, number: 3 });
    prisma.chapter.findMany.mockResolvedValue([{ id: 1, name: "1" }, { id: 2, name: "2" }, { id: 3, name: "3" }]);
    prisma.series.findUnique.mockResolvedValue({ name: "Test" });
    prisma.userChapterRead.findMany.mockResolvedValue([]);

    const result = await toggleChapterRead("u1", 3);

    expect(result.updated).toBe(3);
  });

  it("desmarca desde el capitulo si ya existe lectura", async () => {
    prisma.userChapterRead.findUnique.mockResolvedValue({ id: 1 });
    prisma.chapter.findUnique.mockResolvedValue({ seriesId: 1, number: 3 });
    prisma.chapter.findMany.mockResolvedValue([{ id: 3 }, { id: 4 }]);

    const result = await toggleChapterRead("u1", 3);

    expect(prisma.userChapterRead.deleteMany).toHaveBeenCalled();
  });
});

describe("readService.progress methods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upsertChapterProgress crea o actualiza progreso", async () => {
    prisma.chapter.findUnique.mockResolvedValue({ id: 10 });
    prisma.userChapterProgress.upsert.mockResolvedValue({
      userId: "u1", chapterId: 10, pageNumber: 5, percentage: 50,
    });

    const result = await upsertChapterProgress("u1", 10, { pageNumber: 5, percentage: 50 });

    expect(result.pageNumber).toBe(5);
  });

  it("getChapterProgress retorna progreso existente", async () => {
    prisma.userChapterProgress.findUnique.mockResolvedValue({
      userId: "u1", chapterId: 10, pageNumber: 3, percentage: 30,
    });

    const result = await getChapterProgress("u1", 10);

    expect(result.pageNumber).toBe(3);
  });

  it("getChapterProgress retorna null si no existe", async () => {
    prisma.userChapterProgress.findUnique.mockResolvedValue(null);

    const result = await getChapterProgress("u1", 999);
    expect(result).toBeNull();
  });

  it("getSeriesProgress retorna progresos de una serie", async () => {
    prisma.userChapterProgress.findMany.mockResolvedValue([
      { chapterId: 10, pageNumber: 5, percentage: 50, updatedAt: new Date() },
    ]);

    const result = await getSeriesProgress("u1", 1);

    expect(result).toHaveLength(1);
    expect(prisma.userChapterProgress.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1", chapter: { seriesId: 1 } },
      }),
    );
  });

  it("getSeriesProgress retorna array vacio si no hay progreso", async () => {
    prisma.userChapterProgress.findMany.mockResolvedValue([]);

    const result = await getSeriesProgress("u1", 999);
    expect(result).toEqual([]);
  });
});
