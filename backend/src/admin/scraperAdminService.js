import axios from "axios";
import * as cheerio from "cheerio";
import { prisma } from "../config/prisma.js";
import { runAllScrapers, runSingleProvider, runPagesOnly, isRunning, stopScraper } from "../manga/scrapers/scraper.js";
import { syncGenres } from "../manga/scrapers/syncGenres.js";
import { processSeriesChapters as processOlympusChapters } from "../manga/scrapers/olympus/chapters_scraper.js";
import { processSeriesChapters as processManhwawebChapters } from "../manga/scrapers/manhwaweb/chapters_scraper.js";
import { processSeriesChapters as processLeermangaespChapters } from "../manga/scrapers/leermangaesp/chapters_scraper.js";
import { processChapterPages as processOlympusPages } from "../manga/scrapers/olympus/pages_scraper.js";
import { processChapterPages as processManhwawebPages } from "../manga/scrapers/manhwaweb/pages_scraper.js";
import { processChapterPages as processLeermangaespPages } from "../manga/scrapers/leermangaesp/pages_scraper.js";
import logger from "../config/logger.js";

const ALL_PROVIDERS = ["olympus", "manhwaweb", "leermangaesp"];
const BASE_URL = "https://mangalect.org";
const CDN_URL = "https://images.mangalect.org/file/leermangaesp";

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

  static async scrapeSingleSeries(seriesId) {
    const series = await prisma.series.findUnique({
      where: { id: seriesId },
      include: {
        providerSeries: { include: { provider: true } },
      },
    });

    if (!series) throw Object.assign(new Error("Serie no encontrada"), { statusCode: 404 });
    if (series.providerSeries.length === 0) throw Object.assign(new Error("La serie no tiene providers asociados"), { statusCode: 400 });

    const results = [];

    for (const ps of series.providerSeries) {
      const providerName = ps.provider.name;

      try {
        if (providerName === "olympus") {
          const { data } = await axios.get(
            `https://olympusbiblioteca.com/api/series/${ps.slug}`,
            { params: { type: "comic" }, timeout: 30000 },
          );
          const d = data.data;

          await prisma.$transaction(async (tx) => {
            await tx.series.update({
              where: { id: seriesId },
              data: {
                name: d.name,
                cover: d.cover ?? undefined,
                status: d.status?.name ?? undefined,
                summary: d.summary ?? undefined,
                chapterCount: d.chapter_count ?? undefined,
                metadataFetchedAt: new Date(),
              },
            });

            if (d.genres?.length) {
              await syncGenres(seriesId, d.genres.map((g) => g.name.trim()), tx);
            }

            if (d.slug !== ps.slug) {
              await tx.providerSeries.update({
                where: { id: ps.id },
                data: { slug: d.slug },
              });
            }
          });

          await processOlympusChapters(ps, ps.provider.id);
          const olympusPending = await prisma.providerChapter.findMany({
            where: {
              providerId: ps.provider.id,
              chapter: { seriesId, pagesScraped: false },
            },
            include: { chapter: true },
          });
          for (const pc of olympusPending) {
            await processOlympusPages(pc, ps.provider.id);
          }
          results.push({ provider: "olympus", status: "ok", chapters: olympusPending.length });
        } else if (providerName === "manhwaweb") {
          const { data: metadata } = await axios.get(
            `https://manhwawebbackend-production.up.railway.app/manhwa/see/${ps.externalId}`,
            { timeout: 30000 },
          );

          if (metadata) {
            const genres =
              metadata._categoris
                ?.map((cat) => {
                  if (typeof cat === "object") return Object.values(cat)[0];
                  return null;
                })
                .filter(Boolean) ?? [];

            await prisma.$transaction(async (tx) => {
              await tx.series.update({
                where: { id: seriesId },
                data: {
                  summary: metadata._sinopsis ?? undefined,
                  metadataFetchedAt: new Date(),
                },
              });

              if (genres.length) {
                await syncGenres(seriesId, genres, tx);
              }
            });
          }

          await processManhwawebChapters(ps, ps.provider.id);
          const manhwawebPending = await prisma.providerChapter.findMany({
            where: {
              providerId: ps.provider.id,
              chapter: { seriesId, pagesScraped: false },
            },
            include: { chapter: true },
          });
          for (const pc of manhwawebPending) {
            await processManhwawebPages(pc, ps.provider.id);
          }
          results.push({ provider: "manhwaweb", status: "ok", chapters: manhwawebPending.length });
        } else if (providerName === "leermangaesp") {
          const originalSlug = ps.url ?? ps.slug.replace("leermangaesp-", "");
          const { data: html } = await axios.get(
            `${BASE_URL}/info/${originalSlug}/`,
            { timeout: 30000 },
          );
          const $ = cheerio.load(html);

          const summary = $("#synopsis-text").text().trim() || null;

          const STATUS_MAP = {
            "En curso": "Activo",
            Completado: "Finalizado",
            "En pausa": "En pausa",
            Cancelado: "Abandonado por el scan",
          };
          const statusRaw = $("#info-block .info-value").text().trim();
          const status = STATUS_MAP[statusRaw] ?? null;

          const genres = [];
          $(".info-generos .genero-item").each((_, el) => {
            const g = $(el).text().trim();
            if (g) genres.push(g);
          });

          const buildCoverUrl = (url) => {
            if (!url) return null;
            if (url.startsWith("http")) return url;
            return `${CDN_URL}/${url}`;
          };

          const rel = $("body").attr("data-portada-rel");
          const abs = $(".manga-cover img").attr("src");
          let cover = null;
          for (const candidate of [rel && buildCoverUrl(rel), abs && buildCoverUrl(abs)].filter(Boolean)) {
            try {
              const head = await axios.head(candidate, { timeout: 5000 });
              if (head.status >= 200 && head.status < 400) {
                cover = candidate;
                break;
              }
            } catch {
              // continue
            }
          }

          await prisma.$transaction(async (tx) => {
            await tx.series.update({
              where: { id: seriesId },
              data: {
                summary: summary ?? undefined,
                status: status ?? undefined,
                cover: cover ?? undefined,
                metadataFetchedAt: new Date(),
              },
            });

            if (genres.length) {
              await syncGenres(seriesId, genres, tx);
            }
          });

          await processLeermangaespChapters(ps, ps.provider.id);
          const leermangaespPending = await prisma.providerChapter.findMany({
            where: {
              providerId: ps.provider.id,
              chapter: { seriesId, pagesScraped: false },
            },
            include: { chapter: true },
          });
          for (const pc of leermangaespPending) {
            await processLeermangaespPages(pc, ps.provider.id);
          }
          results.push({ provider: "leermangaesp", status: "ok", chapters: leermangaespPending.length });
        } else {
          results.push({ provider: providerName, status: "skipped", reason: "provider no soportado" });
        }
      } catch (error) {
        logger.error({ provider: providerName, err: error.message }, "Error al scrapear serie individual");
        results.push({ provider: providerName, status: "error", error: error.message });
      }
    }

    return { seriesId, results };
  }

  static async fullScrapeSeries(seriesId, providerName) {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const provider = await prisma.provider.findUnique({ where: { name: providerName } });
    if (!provider) throw Object.assign(new Error(`Provider "${providerName}" no encontrado`), { statusCode: 404 });

    const ps = await prisma.providerSeries.findUnique({
      where: { providerId_seriesId: { providerId: provider.id, seriesId } },
    });
    if (!ps) throw Object.assign(new Error(`La serie no tiene el provider "${providerName}" asociado`), { statusCode: 400 });

    let newChapters = 0;
    let refilledChapters = 0;
    const errors = [];

    const processChapter = async (externalId, chapterData, processPages) => {
      try {
        const existingPc = await prisma.providerChapter.findUnique({
          where: { providerId_externalId: { providerId: provider.id, externalId } },
          include: { chapter: true },
        });

        if (existingPc) {
          if (!existingPc.chapter.pagesScraped) {
            await prisma.page.deleteMany({ where: { chapterId: existingPc.chapterId } });
            const freshPc = await prisma.providerChapter.findUnique({
              where: { id: existingPc.id },
              include: { chapter: true },
            });
            if (freshPc) await processPages(freshPc);
            refilledChapters++;
          }
          return;
        }

        const existingChapter = await prisma.chapter.findFirst({
          where: {
            seriesId,
            OR: [
              { name: chapterData.name },
              ...(chapterData.number !== null ? [{ number: chapterData.number }] : []),
            ],
          },
        });

        let chapterId;
        if (existingChapter) {
          chapterId = existingChapter.id;
        } else {
          const newC = await prisma.chapter.create({
            data: { name: chapterData.name, number: chapterData.number, publishedAt: chapterData.publishedAt, seriesId },
          });
          chapterId = newC.id;
        }

        await prisma.providerChapter.create({
          data: { providerId: provider.id, externalId, chapterId },
        });

        const pc = await prisma.providerChapter.findUnique({
          where: { providerId_externalId: { providerId: provider.id, externalId } },
          include: { chapter: true },
        });
        if (pc) await processPages(pc);
        newChapters++;
      } catch (err) {
        logger.error({ provider: providerName, externalId, err: err.message }, "Error en capítulo full scrape");
        errors.push({ externalId, error: err.message });
      }
    };

    try {
      if (providerName === "olympus") {
        const processPages = (pc) => processOlympusPages(pc, provider.id);

        const { data: firstPage } = await axios.get(
          `https://panel.olympusxyz.com/api/series/${ps.slug}/chapters`,
          { params: { page: 1, direction: "desc", type: "comic" }, timeout: 30000 },
        );
        const lastPage = firstPage.meta.last_page;

        for (let page = 1; page <= lastPage; page++) {
          const data = page === 1 ? firstPage : (await axios.get(
            `https://panel.olympusxyz.com/api/series/${ps.slug}/chapters`,
            { params: { page, direction: "desc", type: "comic" }, timeout: 30000 },
          )).data;

          for (const ch of data.data) {
            const chapterNumber = (() => {
              const m = ch.name?.match(/(\d+(?:\.\d+)?)/);
              return m ? parseFloat(m[0]) : null;
            })();
            await processChapter(String(ch.id), {
              name: ch.name,
              number: chapterNumber,
              publishedAt: new Date(ch.published_at),
            }, processPages);
          }
          await sleep(300);
        }
      } else if (providerName === "manhwaweb") {
        const processPages = (pc) => processManhwawebPages(pc, provider.id);

        const { data } = await axios.get(
          `https://manhwawebbackend-production.up.railway.app/manhwa/see/${ps.externalId}`,
          { timeout: 45000 },
        );
        const chapters = (data.chapters ?? []).slice().reverse();

        for (const ch of chapters) {
          const chapterExternalId = `${ps.externalId}-${ch.chapter}`;
          const chapterName = String(ch.chapter);
          const chapterNumber = parseFloat(chapterName);
          await processChapter(chapterExternalId, {
            name: chapterName,
            number: isNaN(chapterNumber) ? null : chapterNumber,
            publishedAt: ch.create ? new Date(ch.create) : new Date(),
          }, processPages);
        }
      } else if (providerName === "leermangaesp") {
        const processPages = (pc) => processLeermangaespPages(pc, provider.id);
        const originalSlug = ps.url;
        let before = null;
        const allChapters = [];

        for (let page = 0; page < 100; page++) {
          const url = before
            ? `${BASE_URL}/info/${originalSlug}/?before=${before}`
            : `${BASE_URL}/info/${originalSlug}/`;
          const { data: html } = await axios.get(url, { timeout: 30000 });
          const $ = cheerio.load(html);

          $("#chapter-list .chapter-link").each((_, el) => {
            const rawNumber = $(el).attr("data-chapter");
            if (!rawNumber) return;
            const chapterDate = $(el).find(".chapter-date").text().trim();
            const num = parseFloat(rawNumber);
            allChapters.push({
              externalId: `${ps.externalId}-${rawNumber}`,
              name: rawNumber,
              number: isNaN(num) ? null : num,
              publishedAt: chapterDate ? new Date(chapterDate) : new Date(),
            });
          });

          const moreLink = $("#more-link");
          let nextBefore = null;
          if (moreLink.length) {
            const href = moreLink.attr("href");
            if (href) {
              const match = href.match(/[?&]before=([\d.]+)/);
              if (match) nextBefore = match[1];
            }
          }

          if (!nextBefore) break;
          before = nextBefore;
          await sleep(1500);
        }

        for (const ch of allChapters) {
          await processChapter(ch.externalId, {
            name: ch.name,
            number: ch.number,
            publishedAt: ch.publishedAt,
          }, processPages);
        }
      } else {
        throw Object.assign(new Error(`Provider "${providerName}" no soportado`), { statusCode: 400 });
      }
    } catch (error) {
      logger.error({ provider: providerName, seriesId, err: error.message }, "Error en full scrape");
      throw error;
    }

    return { provider: providerName, newChapters, refilledChapters, errors: errors.length > 0 ? errors : undefined };
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
        `${BASE_URL}/lectura/${originalSlug}/${chapterNumber}/`,
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
              return path.startsWith("http") ? path : `${CDN_URL}${path}`;
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
