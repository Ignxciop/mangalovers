import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    userChapterRead: {
      findMany: vi.fn(),
    },
    userFavorite: {
      findMany: vi.fn(),
    },
    chapter: {
      groupBy: vi.fn(),
    },
    series: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "../../../src/config/prisma.js";
import { getFullStats } from "../../../src/read/readService.js";

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
    const dayOfWeek = today.getDay();
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
