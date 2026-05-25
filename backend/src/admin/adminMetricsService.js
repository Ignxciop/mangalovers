import { prisma } from "../config/prisma.js";

const STATUSES = ["OPEN", "REVIEWING", "RESOLVED", "REJECTED", "CLOSED"];

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
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
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
}
