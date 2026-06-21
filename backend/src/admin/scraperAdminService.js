import axios from "axios";
import * as cheerio from "cheerio";
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

  static async refillSingleChapter(chapterId) {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        providerChapters: {
          include: { provider: true },
          take: 1,
        },
      },
    });

    if (!chapter) {
      throw Object.assign(new Error(`Capítulo ${chapterId} no encontrado`), { statusCode: 404 });
    }

    if (chapter.providerChapters.length === 0) {
      throw Object.assign(new Error(`Capítulo ${chapterId} no tiene ProviderChapter asociado`), { statusCode: 400 });
    }

    const pc = chapter.providerChapters[0];
    const providerName = pc.provider.name;

    // Eliminar páginas existentes
    await prisma.page.deleteMany({ where: { chapterId } });

    let pages = [];

    if (providerName === "olympus") {
      const ps = await prisma.providerSeries.findFirst({
        where: { providerId: pc.providerId, seriesId: chapter.seriesId },
        select: { slug: true },
      });
      if (!ps?.slug) {
        throw Object.assign(new Error(`ProviderSeries slug no encontrado`), { statusCode: 400 });
      }
      const { data } = await axios.get(
        `https://olympusbiblioteca.com/api/capitulo/${ps.slug}/${pc.externalId}`,
        { params: { type: "comic" }, timeout: 30000 },
      );
      pages = data.chapter?.pages ?? [];
    } else if (providerName === "manhwaweb") {
      const { data } = await axios.get(
        `https://manhwawebbackend-production.up.railway.app/chapters/see/${pc.externalId}`,
        { timeout: 30000 },
      );
      pages = (data.chapter?.img ?? []).filter((url) => url?.trim());
    } else if (providerName === "leermangaesp") {
      const ps = await prisma.providerSeries.findFirst({
        where: { providerId: pc.providerId, seriesId: chapter.seriesId },
        select: { url: true },
      });
      if (!ps?.url) {
        throw Object.assign(new Error(`ProviderSeries url no encontrado`), { statusCode: 400 });
      }
      const originalSlug = ps.url;
      const chapterNumber = pc.externalId.split("-").slice(1).join("-").replace(/\.0+$/, "");
      const { data: html } = await axios.get(
        `https://leermangaesp.net/leer-m/${originalSlug}/${chapterNumber}/`,
        { timeout: 30000 },
      );
      const $ = cheerio.load(html);
      $("img.manga-image").each((_, el) => {
        const src = $(el).attr("src");
        if (src) pages.push(src);
      });
      if (pages.length === 0) {
        const scriptMatch = html.match(/paginasRutas\s*=\s*\[([^\]]+)\]/);
        if (scriptMatch) {
          const urls = scriptMatch[1].match(/"([^"]+)"/g);
          if (urls) {
            pages = urls.map((u) => {
              const path = u.replace(/"/g, "");
              return path.startsWith("http") ? path : `https://leermangaesp.net${path}`;
            });
          }
        }
      }
    } else {
      throw Object.assign(new Error(`Provider ${providerName} no soportado`), { statusCode: 400 });
    }

    if (pages.length === 0) {
      logger.warn({ chapterId, provider: providerName }, "No se encontraron páginas para el capítulo");
      return { success: false, message: "No se encontraron páginas. El capítulo queda sin páginas.", pagesCount: 0 };
    }

    await prisma.page.createMany({
      data: pages.map((url) => ({ url, chapterId })),
      skipDuplicates: true,
    });

    await prisma.chapter.update({
      where: { id: chapterId },
      data: { pagesScraped: true },
    });

    logger.info({ chapterId, provider: providerName, pageCount: pages.length }, "Capítulo re-scrapeado manualmente");
    return { success: true, pagesCount: pages.length, provider: providerName };
  }

  static async refillMissingPages(provider, maxPages = null) {
    const dbProvider = await prisma.provider.findUnique({ where: { name: provider } });
    if (!dbProvider) throw Object.assign(new Error(`Provider ${provider} no encontrado`), { statusCode: 404 });

    const allIds = [];

    // 1. Capítulos con 0 páginas (comportamiento original)
    const zeroPageChapters = await prisma.chapter.findMany({
      where: {
        pages: { none: {} },
        providerChapters: { some: { providerId: dbProvider.id } },
      },
      select: { id: true },
    });
    allIds.push(...zeroPageChapters.map((c) => c.id));

    // 2. Capítulos con páginas rotas (pocas páginas, si se especificó maxPages)
    if (maxPages && maxPages > 1) {
      const raw = await prisma.$queryRaw`
        SELECT c.id
        FROM "Chapter" c
        INNER JOIN "ProviderChapter" pc ON pc."chapterId" = c.id
        LEFT JOIN "Page" p ON p."chapterId" = c.id
        WHERE pc."providerId" = ${dbProvider.id}
          AND c."pagesScraped" = true
        GROUP BY c.id
        HAVING COUNT(p.id) > 0 AND COUNT(p.id) < ${maxPages}
      `;
      const brokenIds = raw.map((r) => Number(r.id));
      if (brokenIds.length > 0) {
        const CHUNK = 10000;
        for (let i = 0; i < brokenIds.length; i += CHUNK) {
          await prisma.page.deleteMany({
            where: { chapterId: { in: brokenIds.slice(i, i + CHUNK) } },
          });
        }
        allIds.push(...brokenIds);
      }
    }

    if (allIds.length === 0) {
      return { reset: 0, message: "No hay capítulos por re-scrapear para este provider" };
    }

    // Deduplicar y resetear
    const uniqueIds = [...new Set(allIds)];
    const CHUNK = 10000;
    for (let i = 0; i < uniqueIds.length; i += CHUNK) {
      await prisma.chapter.updateMany({
        where: { id: { in: uniqueIds.slice(i, i + CHUNK) } },
        data: { pagesScraped: false },
      });
    }

    logger.info({ provider, count: uniqueIds.length }, "Capítulos reseteados, iniciando scrape de páginas");

    await runPagesOnly(provider, "manual-refill");

    return { reset: uniqueIds.length };
  }
}
