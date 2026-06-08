import { prisma } from "../config/prisma.js";

const STATUSES = ["OPEN", "REVIEWING", "RESOLVED", "REJECTED", "CLOSED"];

const startOfDay = () => new Date(new Date().setHours(0, 0, 0, 0));
const startOfWeek = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(new Date(d.setDate(diff)).setHours(0, 0, 0, 0));
};
const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const monthsAgo = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
};

export class AdminMetricsService {
  static async getMetrics() {
    const [
      totalUsers,
      totalAdmins,
      totalSeries,
      totalChapters,
      totalSuggestions,
      suggestionsToday,
      ...statusCounts
    ] = await Promise.all([
      prisma.user.count({ where: { role: "USER" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.series.count(),
      prisma.chapter.count(),
      prisma.suggestion.count(),
      prisma.suggestion.count({
        where: { createdAt: { gte: startOfDay() } },
      }),
      ...STATUSES.map((s) =>
        prisma.suggestion.count({ where: { status: s } }),
      ),
    ]);

    const suggestionsByStatus = {};
    STATUSES.forEach((s, i) => {
      suggestionsByStatus[s] = statusCounts[i];
    });

    return {
      users: {
        total: totalUsers + totalAdmins,
        regular: totalUsers,
        admins: totalAdmins,
      },
      content: {
        series: totalSeries,
        chapters: totalChapters,
      },
      suggestions: {
        total: totalSuggestions,
        today: suggestionsToday,
        byStatus: suggestionsByStatus,
      },
    };
  }

  static async getOverview() {
    const [base, usersActiveToday, usersActiveWeek, newUsersToday, newUsersWeek, seriesUpdatedToday, chaptersAddedToday, chaptersNoPages, suggestionsOpen, lastScraperRun] = await Promise.all([
      this.getMetrics(),
      prisma.userChapterRead.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: startOfDay() } },
        _count: true,
      }),
      prisma.userChapterRead.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: startOfWeek() } },
        _count: true,
      }),
      prisma.user.count({
        where: { createdAt: { gte: startOfDay() } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: startOfWeek() } },
      }),
      prisma.series.count({
        where: { lastChapterPublishedAt: { gte: daysAgo(1) } },
      }),
      prisma.chapter.count({
        where: { createdAt: { gte: startOfDay() } },
      }),
      prisma.chapter.count({
        where: { pagesScraped: false },
      }),
      prisma.suggestion.count({
        where: { status: "OPEN" },
      }),
      prisma.scraperRun.findFirst({
        orderBy: { startedAt: "desc" },
      }),
    ]);

    return {
      ...base,
      users: {
        ...base.users,
        activeToday: usersActiveToday.length,
        activeWeek: usersActiveWeek.length,
        newToday: newUsersToday,
        newWeek: newUsersWeek,
      },
      content: {
        ...base.content,
        updatedToday: seriesUpdatedToday,
        chaptersToday: chaptersAddedToday,
        chaptersNoPages,
      },
      suggestions: {
        ...base.suggestions,
        open: suggestionsOpen,
      },
      scraper: lastScraperRun
        ? {
            provider: lastScraperRun.provider,
            status: lastScraperRun.status,
            startedAt: lastScraperRun.startedAt,
            finishedAt: lastScraperRun.finishedAt,
            seriesProcessed: lastScraperRun.seriesProcessed,
            chaptersCreated: lastScraperRun.chaptersCreated,
            pagesScraped: lastScraperRun.pagesScraped,
            errors: lastScraperRun.errors,
            errorMessage: lastScraperRun.errorMessage,
          }
        : null,
    };
  }

  static async getScraperMetrics() {
    const ACTIVE_PROVIDERS = ["olympus", "manhwaweb", "leermangaesp"];

    const [recentRuns, seriesByProvider] = await Promise.all([
      prisma.scraperRun.findMany({
        orderBy: { startedAt: "desc" },
        take: 30,
      }),
      prisma.providerSeries.groupBy({
        by: ["providerId"],
        _count: { seriesId: true },
      }),
    ]);

    const providers = (await prisma.provider.findMany())
      .filter((p) => ACTIVE_PROVIDERS.includes(p.name));

    const latestRunPromises = providers.map((p) =>
      prisma.scraperRun.findFirst({
        where: { provider: p.name },
        orderBy: { startedAt: "desc" },
      }),
    );
    const weekAggPromises = providers.map((p) =>
      prisma.scraperRun.aggregate({
        where: { provider: p.name, startedAt: { gte: daysAgo(7) } },
        _sum: { seriesProcessed: true, chaptersCreated: true, pagesScraped: true, errors: true },
        _count: true,
      }),
    );

    const [latestRuns, weekAggs] = await Promise.all([
      Promise.all(latestRunPromises),
      Promise.all(weekAggPromises),
    ]);

    return {
      recentRuns,
      providers: providers.map((p, i) => {
        const lastRun = latestRuns[i];
        const summary = weekAggs[i];
        const seriesCount = seriesByProvider.find((s) => s.providerId === p.id)?._count.seriesId ?? 0;
        return {
          id: p.id,
          name: p.name,
          seriesCount,
          lastRun: lastRun ?? null,
          weekRuns: summary._count ?? 0,
          weekSeriesProcessed: summary._sum?.seriesProcessed ?? 0,
          weekChaptersCreated: summary._sum?.chaptersCreated ?? 0,
          weekPagesScraped: summary._sum?.pagesScraped ?? 0,
          weekErrors: summary._sum?.errors ?? 0,
        };
      }),
    };
  }

  static async getUserMetrics() {
    const [totalByRole, totalByStatus, monthlyRegistrations, usersActiveToday, usersActive7d, usersActive30d, topReaders] = await Promise.all([
      prisma.user.groupBy({
        by: ["role"],
        _count: true,
      }),
      prisma.user.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.$queryRaw`
        SELECT
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*)::int as count
        FROM users
        WHERE "createdAt" >= ${monthsAgo(12)}
        GROUP BY month
        ORDER BY month ASC
      `,
      prisma.userChapterRead.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: startOfDay() } },
        _count: { chapterId: true },
      }),
      prisma.userChapterRead.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: daysAgo(7) } },
        _count: { chapterId: true },
      }),
      prisma.userChapterRead.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: daysAgo(30) } },
        _count: { chapterId: true },
      }),
      prisma.userChapterRead.groupBy({
        by: ["userId"],
        _count: { chapterId: true },
        orderBy: { _count: { chapterId: "desc" } },
        take: 10,
      }),
    ]);

    const topReaderIds = topReaders.map((r) => r.userId);
    const topReaderUsers = topReaderIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: topReaderIds } },
          select: { id: true, name: true, lastname: true, email: true },
        })
      : [];

    return {
      byRole: Object.fromEntries(totalByRole.map((r) => [r.role, r._count])),
      byStatus: Object.fromEntries(totalByStatus.map((r) => [r.status, r._count])),
      monthlyRegistrations: monthlyRegistrations.map((r) => ({
        month: r.month,
        count: Number(r.count),
      })),
      activeUsers: {
        today: usersActiveToday.length,
        last7d: usersActive7d.length,
        last30d: usersActive30d.length,
      },
      topReaders: topReaders.map((r) => {
        const user = topReaderUsers.find((u) => u.id === r.userId);
        return {
          userId: r.userId,
          name: user ? `${user.name} ${user.lastname}` : "Unknown",
          email: user?.email ?? "",
          chaptersRead: r._count.chapterId,
        };
      }),
    };
  }

  static async getContentMetrics() {
    const [seriesByStatus, seriesByType, genreDistribution, emptySeries, chaptersNoPages, chaptersPerSeriesHistogram] = await Promise.all([
      prisma.series.groupBy({
        by: ["status"],
        _count: true,
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.series.groupBy({
        by: ["type"],
        _count: true,
      }),
      prisma.$queryRaw`
        SELECT g.name, COUNT(sg."seriesId")::int as count
        FROM "Genre" g
        JOIN "SeriesGenre" sg ON sg."genreId" = g.id
        GROUP BY g.id, g.name
        ORDER BY count DESC
        LIMIT 20
      `,
      prisma.series.count({
        where: { chapterCount: 0 },
      }),
      prisma.chapter.count({
        where: { pagesScraped: false },
      }),
      prisma.$queryRaw`
        SELECT
          CASE
            WHEN c."chapterCount" = 0 THEN '0'
            WHEN c."chapterCount" <= 5 THEN '1-5'
            WHEN c."chapterCount" <= 20 THEN '6-20'
            WHEN c."chapterCount" <= 50 THEN '21-50'
            WHEN c."chapterCount" <= 100 THEN '51-100'
            ELSE '100+'
          END as bucket,
          COUNT(*)::int as count
        FROM "Series" c
        GROUP BY bucket
        ORDER BY bucket
      `,
    ]);

    return {
      seriesByStatus: seriesByStatus.map((s) => ({ status: s.status ?? "Sin estado", count: s._count })),
      seriesByType: seriesByType.map((s) => ({ type: s.type ?? "Sin tipo", count: s._count })),
      genreDistribution: genreDistribution.map((g) => ({ name: g.name, count: Number(g.count) })),
      emptySeries,
      chaptersNoPages,
      chaptersPerSeries: chaptersPerSeriesHistogram.map((h) => ({
        bucket: String(h.bucket),
        count: Number(h.count),
      })),
    };
  }

  static async getSystemMetrics() {
    const [eventsLast30d, apiErrors, recentRateLimits, topUsers] = await Promise.all([
      prisma.userActivity.groupBy({
        by: ["event"],
        where: { createdAt: { gte: daysAgo(30) } },
        _count: true,
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.userActivity.findMany({
        where: {
          event: "API_ERROR",
          createdAt: { gte: daysAgo(7) },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: { select: { name: true, lastname: true, email: true } },
        },
      }),
      prisma.userActivity.count({
        where: {
          event: "RATE_LIMIT",
          createdAt: { gte: daysAgo(7) },
        },
      }),
      prisma.userActivity.groupBy({
        by: ["userId"],
        _count: true,
        orderBy: { _count: { id: "desc" } },
        take: 10,
        where: { createdAt: { gte: daysAgo(30) } },
      }),
    ]);

    const topUserIds = topUsers.map((u) => u.userId);
    const topUserDetails = topUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: topUserIds } },
          select: { id: true, name: true, lastname: true, email: true },
        })
      : [];

    const totalEvents = eventsLast30d.reduce((acc, e) => acc + e._count, 0);
    const errorCount = eventsLast30d.find((e) => e.event === "API_ERROR")?._count ?? 0;

    return {
      eventsByType: eventsLast30d.map((e) => ({
        event: e.event,
        count: e._count,
      })),
      totalEvents,
      errorRate: totalEvents > 0 ? (errorCount / totalEvents) * 100 : 0,
      recentErrors: apiErrors.map((e) => ({
        id: e.id,
        event: e.event,
        metadata: e.metadata,
        createdAt: e.createdAt,
        user: e.user ? `${e.user.name} ${e.user.lastname}` : "Unknown",
      })),
      rateLimitsLast7d: recentRateLimits,
      topActiveUsers: topUsers.map((u) => {
        const user = topUserDetails.find((d) => d.id === u.userId);
        return {
          userId: u.userId,
          name: user ? `${user.name} ${user.lastname}` : "Unknown",
          email: user?.email ?? "",
          events: u._count,
        };
      }),
    };
  }
}
