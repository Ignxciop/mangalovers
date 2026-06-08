import { prisma } from "../config/prisma.js";
import logger from "../config/logger.js";

export class AdminToolsService {
  static async fixEmptyChapters() {
    const emptyChapters = await prisma.chapter.findMany({
      where: {
        pages: { none: {} },
      },
      select: { id: true },
    });

    const count = emptyChapters.length;

    if (count === 0) {
      return { count: 0, message: "No hay capítulos sin páginas" };
    }

    const ids = emptyChapters.map((c) => c.id);

    await prisma.chapter.updateMany({
      where: { id: { in: ids } },
      data: { pagesScraped: false },
    });

    logger.info({ count }, "Capítulos sin páginas reseteados — listos para re-scrape");

    return {
      count,
      message: `${count} capítulo${count !== 1 ? "s" : ""} sin páginas reseteado${count !== 1 ? "s" : ""}. El scraper los reprocesará en la próxima ejecución.`,
    };
  }
}
