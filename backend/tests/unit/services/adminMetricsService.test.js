import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    user: { count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
    series: { count: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), groupBy: vi.fn(), update: vi.fn() },
    chapter: { count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
    suggestion: { count: vi.fn() },
    userChapterRead: { groupBy: vi.fn(), findMany: vi.fn() },
    scraperRun: { findMany: vi.fn(), findFirst: vi.fn(), aggregate: vi.fn(), count: vi.fn() },
    provider: { findMany: vi.fn() },
    providerSeries: { groupBy: vi.fn() },
    userActivity: { groupBy: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "../../../src/config/prisma.js";
import { AdminMetricsService } from "../../../src/admin/adminMetricsService.js";

describe("AdminMetricsService.getMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna metricas basicas del sistema", async () => {
    prisma.user.count
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(2);
    prisma.series.count.mockResolvedValue(50);
    prisma.chapter.count.mockResolvedValue(2000);
    prisma.suggestion.count
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(5);

    for (let i = 0; i < 5; i++) {
      prisma.suggestion.count.mockResolvedValueOnce(i * 5);
    }

    const result = await AdminMetricsService.getMetrics();

    expect(result.users.total).toBe(102);
    expect(result.users.regular).toBe(100);
    expect(result.users.admins).toBe(2);
    expect(result.content.series).toBe(50);
    expect(result.content.chapters).toBe(2000);
    expect(result.suggestions.total).toBe(30);
    expect(result.suggestions.today).toBe(5);
  });
});

describe("AdminMetricsService.getScraperMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna metricas de scrapers con providers activos", async () => {
    prisma.scraperRun.findMany.mockResolvedValue([]);
    prisma.providerSeries.groupBy.mockResolvedValue([]);

    prisma.provider.findMany.mockResolvedValue([
      { id: 1, name: "olympus" },
      { id: 2, name: "manhwaweb" },
      { id: 3, name: "leermangaesp" },
    ]);

    prisma.scraperRun.findFirst.mockResolvedValue({
      id: 1, provider: "olympus", status: "success", startedAt: new Date(),
      finishedAt: new Date(), seriesProcessed: 5, chaptersCreated: 20, errors: 0,
    });

    prisma.scraperRun.aggregate.mockResolvedValue({
      _count: 7,
      _sum: { seriesProcessed: 50, chaptersCreated: 150, pagesScraped: 300, errors: 2 },
    });

    const result = await AdminMetricsService.getScraperMetrics();

    expect(result.providers).toHaveLength(3);
    expect(result.providers[0].name).toBe("olympus");
    expect(result.providers[0].weekRuns).toBe(7);
    expect(result.providers[0].weekChaptersCreated).toBe(150);
    expect(result.providers[1].name).toBe("manhwaweb");
    expect(result.providers[2].name).toBe("leermangaesp");
  });

  it("filtra providers inactivos (ej: zonatmo)", async () => {
    prisma.scraperRun.findMany.mockResolvedValue([]);
    prisma.providerSeries.groupBy.mockResolvedValue([]);

    prisma.provider.findMany.mockResolvedValue([
      { id: 1, name: "olympus" },
      { id: 4, name: "zonatmo" },
    ]);

    prisma.scraperRun.findFirst.mockResolvedValue(null);
    prisma.scraperRun.aggregate.mockResolvedValue({
      _count: 0,
      _sum: { seriesProcessed: 0, chaptersCreated: 0, pagesScraped: 0, errors: 0 },
    });

    const result = await AdminMetricsService.getScraperMetrics();

    expect(result.providers).toHaveLength(1);
    expect(result.providers[0].name).toBe("olympus");
  });

  it("incluye recentRuns en la respuesta", async () => {
    prisma.scraperRun.findMany.mockResolvedValue([
      { id: 1, provider: "olympus", status: "success", startedAt: new Date(), finishedAt: new Date(), seriesProcessed: 5, chaptersCreated: 10, errors: 0 },
    ]);
    prisma.providerSeries.groupBy.mockResolvedValue([]);
    prisma.provider.findMany.mockResolvedValue([{ id: 1, name: "olympus" }]);
    prisma.scraperRun.findFirst.mockResolvedValue(null);
    prisma.scraperRun.aggregate.mockResolvedValue({
      _count: 0, _sum: { seriesProcessed: 0, chaptersCreated: 0, pagesScraped: 0, errors: 0 },
    });

    const result = await AdminMetricsService.getScraperMetrics();

    expect(result.recentRuns).toHaveLength(1);
    expect(result.recentRuns[0].provider).toBe("olympus");
  });
});

describe("AdminMetricsService.getUserMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna metricas de usuarios", async () => {
    prisma.user.groupBy
      .mockResolvedValueOnce([
        { role: "USER", _count: 100 },
        { role: "ADMIN", _count: 2 },
      ])
      .mockResolvedValueOnce([{ status: "ACTIVE", _count: 100 }]);

    prisma.$queryRaw.mockResolvedValue([
      { month: new Date("2025-01-01"), count: 10 },
    ]);

    prisma.userChapterRead.groupBy
      .mockResolvedValueOnce([{ userId: "u1", _count: { chapterId: 5 } }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ userId: "u1", _count: { chapterId: 5 } }, { userId: "u2", _count: { chapterId: 3 } }]);

    prisma.user.findMany.mockResolvedValue([
      { id: "u1", name: "Test", lastname: "User", email: "test@test.com" },
      { id: "u2", name: "Test2", lastname: "User2", email: "test2@test.com" },
    ]);

    const result = await AdminMetricsService.getUserMetrics();

    expect(result.byRole.USER).toBe(100);
    expect(result.byRole.ADMIN).toBe(2);
    expect(result.activeUsers.today).toBe(1);
    expect(result.activeUsers.last7d).toBe(0);
    expect(result.activeUsers.last30d).toBe(0);
    expect(result.topReaders).toHaveLength(2);
  });
});

describe("AdminMetricsService.getContentMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna metricas de contenido", async () => {
    prisma.series.groupBy
      .mockResolvedValueOnce([{ status: "En emisión", _count: 30 }])
      .mockResolvedValueOnce([{ type: "Manga", _count: 50 }]);

    prisma.$queryRaw
      .mockResolvedValueOnce([{ name: "Acción", count: 20 }])
      .mockResolvedValueOnce([{ bucket: "1-5", count: 10 }]);

    prisma.series.count.mockResolvedValue(5);
    prisma.chapter.count.mockResolvedValue(3);

    const result = await AdminMetricsService.getContentMetrics();

    expect(result.seriesByStatus).toHaveLength(1);
    expect(result.seriesByType).toHaveLength(1);
    expect(result.genreDistribution).toHaveLength(1);
    expect(result.emptySeries).toBe(5);
    expect(result.chaptersNoPages).toBe(3);
    expect(result.chaptersPerSeries).toHaveLength(1);
  });
});

describe("AdminMetricsService.getSystemMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna metricas del sistema", async () => {
    prisma.userActivity.groupBy
      .mockResolvedValueOnce([
        { event: "API_ERROR", _count: 5 },
        { event: "LOGIN", _count: 100 },
      ])
      .mockResolvedValueOnce([
        { userId: "u1", _count: 50 },
      ]);

    prisma.userActivity.findMany.mockResolvedValue([
      {
        id: "e1", event: "API_ERROR", metadata: null, createdAt: new Date(),
        user: { name: "Test", lastname: "User", email: "test@test.com" },
      },
    ]);
    prisma.userActivity.count.mockResolvedValue(3);
    prisma.user.findMany.mockResolvedValue([
      { id: "u1", name: "Test", lastname: "User", email: "test@test.com" },
    ]);

    const result = await AdminMetricsService.getSystemMetrics();

    expect(result.totalEvents).toBe(105);
    expect(result.errorRate).toBeCloseTo(4.76, 1);
    expect(result.rateLimitsLast7d).toBe(3);
    expect(result.recentErrors).toHaveLength(1);
    expect(result.topActiveUsers).toHaveLength(1);
  });

  it("maneja errorRate 0 cuando no hay eventos", async () => {
    prisma.userActivity.groupBy.mockResolvedValue([]);
    prisma.userActivity.findMany.mockResolvedValue([]);
    prisma.userActivity.count.mockResolvedValue(0);
    prisma.userActivity.groupBy.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([]);

    const result = await AdminMetricsService.getSystemMetrics();

    expect(result.totalEvents).toBe(0);
    expect(result.errorRate).toBe(0);
  });
});
