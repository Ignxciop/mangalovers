import { prisma } from "../config/prisma.js";
import { runAllScrapers, runSingleProvider, runPagesOnly, isRunning, stopScraper } from "../manga/scrapers/scraper.js";
import logger from "../config/logger.js";

const ALL_PROVIDERS = ["olympus", "manhwaweb", "leermangaesp"];

export class ScraperAdminService {
  static async getConfig() {
    let config = await prisma.scraperConfig.findFirst();
    if (!config) {
      config = await prisma.scraperConfig.create({
        data: {
          autoEnabled: true,
          intervalMinutes: 60,
          enabledProviders: ALL_PROVIDERS,
        },
      });
    }
    return config;
  }

  static async updateConfig(data) {
    const { autoEnabled, intervalMinutes, enabledProviders } = data;
    const existing = await prisma.scraperConfig.findFirst();
    if (!existing) {
      return prisma.scraperConfig.create({
        data: {
          autoEnabled: autoEnabled ?? true,
          intervalMinutes: intervalMinutes ?? 60,
          enabledProviders: enabledProviders ?? ALL_PROVIDERS,
        },
      });
    }
    return prisma.scraperConfig.update({
      where: { id: existing.id },
      data: {
        ...(autoEnabled !== undefined && { autoEnabled }),
        ...(intervalMinutes !== undefined && { intervalMinutes }),
        ...(enabledProviders !== undefined && { enabledProviders }),
      },
    });
  }

  static async triggerProviderRun(provider, userId) {
    logger.info({ provider, userId }, "Ejecucion manual de scraper solicitado por admin");
    await runSingleProvider(provider, "manual");
    return { success: true };
  }

  static async stopRunningScraper(provider) {
    stopScraper(provider);
    logger.info({ provider }, "Scraper detenido manualmente por admin");
    return { success: true };
  }

  static async getStatus() {
    const config = await this.getConfig();
    const latestRuns = await Promise.all(
      ALL_PROVIDERS.map((p) =>
        prisma.scraperRun.findFirst({
          where: { provider: p },
          orderBy: { startedAt: "desc" },
        }),
      ),
    );

    return {
      isRunning: isRunning(),
      autoEnabled: config.autoEnabled,
      intervalMinutes: config.intervalMinutes,
      enabledProviders: config.enabledProviders,
      providers: ALL_PROVIDERS.map((name, i) => ({
        name,
        enabled: config.enabledProviders.includes(name),
        isRunning: isRunning(name),
        lastRun: latestRuns[i],
      })),
    };
  }

  static async getMissingPages() {
    const providers = await prisma.provider.findMany({
      where: { name: { in: ALL_PROVIDERS } },
    });

    const result = [];
    for (const p of providers) {
      const count = await prisma.chapter.count({
        where: {
          pages: { none: {} },
          providerChapters: { some: { providerId: p.id } },
        },
      });
      result.push({ provider: p.name, count });
    }

    const total = result.reduce((acc, r) => acc + r.count, 0);
    return { providers: result, total };
  }

  static async refillMissingPages(provider) {
    const dbProvider = await prisma.provider.findUnique({ where: { name: provider } });
    if (!dbProvider) throw Object.assign(new Error(`Provider ${provider} no encontrado`), { statusCode: 404 });

    const chapters = await prisma.chapter.findMany({
      where: {
        pages: { none: {} },
        providerChapters: { some: { providerId: dbProvider.id } },
      },
      select: { id: true },
    });

    if (chapters.length === 0) {
      return { reset: 0, message: "No hay capítulos sin páginas para este provider" };
    }

    const ids = chapters.map((c) => c.id);
    await prisma.chapter.updateMany({
      where: { id: { in: ids } },
      data: { pagesScraped: false },
    });

    logger.info({ provider, count: ids.length }, "Capítulos reseteados, iniciando scrape de páginas");

    await runPagesOnly(provider, "manual-refill");

    return { reset: ids.length };
  }
}
