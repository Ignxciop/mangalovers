import { prisma } from "../config/prisma.js";
import { runAllScrapers, runSingleProvider, isRunning } from "../manga/scrapers/scraper.js";
import logger from "../config/logger.js";

const ACTIVE_PROVIDERS = ["olympus", "manhwaweb", "leermangaesp"];

export class ScraperAdminService {
  static async getConfig() {
    let config = await prisma.scraperConfig.findFirst();
    if (!config) {
      config = await prisma.scraperConfig.create({
        data: { autoEnabled: true, intervalMinutes: 60 },
      });
    }
    return config;
  }

  static async updateConfig(data) {
    const { autoEnabled, intervalMinutes } = data;
    const existing = await prisma.scraperConfig.findFirst();
    if (!existing) {
      return prisma.scraperConfig.create({
        data: {
          autoEnabled: autoEnabled ?? true,
          intervalMinutes: intervalMinutes ?? 60,
        },
      });
    }
    return prisma.scraperConfig.update({
      where: { id: existing.id },
      data: {
        ...(autoEnabled !== undefined && { autoEnabled }),
        ...(intervalMinutes !== undefined && { intervalMinutes }),
      },
    });
  }

  static async triggerProviderRun(provider, userId) {
    logger.info({ provider, userId }, "Ejecucion manual de scraper solicitado por admin");
    await runSingleProvider(provider, "manual");
    return { success: true };
  }

  static async getStatus() {
    const latestRuns = await Promise.all(
      ACTIVE_PROVIDERS.map((p) =>
        prisma.scraperRun.findFirst({
          where: { provider: p },
          orderBy: { startedAt: "desc" },
        }),
      ),
    );

    return {
      isRunning: isRunning(),
      autoEnabled: (await this.getConfig()).autoEnabled,
      intervalMinutes: (await this.getConfig()).intervalMinutes,
      providers: ACTIVE_PROVIDERS.map((name, i) => ({
        name,
        lastRun: latestRuns[i],
      })),
    };
  }
}
