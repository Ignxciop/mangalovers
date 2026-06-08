import { prisma } from "../../config/prisma.js";
import logger from "../../config/logger.js";
import { resolveStatus } from "../scrapers/resolveStatus.js";

export async function mergeSeries(keepId, dropId, manhwawebId) {
  await prisma.$transaction(async (tx) => {
    const existingChapters = await tx.chapter.findMany({
      where: { seriesId: keepId },
      select: { name: true },
    });
    const existingNames = new Set(existingChapters.map((c) => c.name));

    const chaptersToMigrate = await tx.chapter.findMany({
      where: { seriesId: dropId },
    });

    for (const ch of chaptersToMigrate) {
      if (existingNames.has(ch.name)) {
        const keepChapter = await tx.chapter.findFirst({
          where: { seriesId: keepId, name: ch.name },
        });
        if (keepChapter) {
          await tx.providerChapter.updateMany({
            where: { chapterId: ch.id },
            data: { chapterId: keepChapter.id },
          });
        }
      } else {
        await tx.chapter.update({
          where: { id: ch.id },
          data: { seriesId: keepId },
        });
      }
    }

    await tx.userFavorite.updateMany({
      where: { seriesId: dropId },
      data: { seriesId: keepId },
    });

    const readsToMigrate = await tx.userChapterRead.findMany({
      where: { chapter: { seriesId: dropId } },
      select: { id: true, userId: true, chapterId: true },
    });

    for (const read of readsToMigrate) {
      const sourceChapter = await tx.chapter.findUnique({
        where: { id: read.chapterId },
        select: { name: true },
      });
      if (!sourceChapter) continue;

      const keepChapter = await tx.chapter.findFirst({
        where: { seriesId: keepId, name: sourceChapter.name },
      });
      if (keepChapter) {
        await tx.userChapterRead.upsert({
          where: {
            userId_chapterId: {
              userId: read.userId,
              chapterId: keepChapter.id,
            },
          },
          create: { userId: read.userId, chapterId: keepChapter.id },
          update: {},
        });
      }
    }

    const mwPs = await tx.providerSeries.findFirst({
      where: { providerId: manhwawebId, seriesId: dropId },
    });

    if (mwPs) {
      const existingLink = await tx.providerSeries.findUnique({
        where: {
          providerId_seriesId: {
            providerId: manhwawebId,
            seriesId: keepId,
          },
        },
      });

      if (existingLink) {
        await tx.providerSeries.delete({ where: { id: mwPs.id } });
      } else {
        await tx.providerSeries.update({
          where: { id: mwPs.id },
          data: { seriesId: keepId },
        });
      }
    }

    const droppedSeries = await tx.series.findUnique({
      where: { id: dropId },
      select: { status: true },
    });
    if (droppedSeries?.status) {
      const keptSeries = await tx.series.findUnique({
        where: { id: keepId },
        select: { status: true },
      });
      const resolved = resolveStatus(keptSeries?.status, droppedSeries.status);
      if (resolved !== keptSeries?.status) {
        await tx.series.update({
          where: { id: keepId },
          data: { status: resolved },
        });
      }
    }

    await tx.page.deleteMany({ where: { chapter: { seriesId: dropId } } });
    await tx.chapter.deleteMany({ where: { seriesId: dropId } });
    await tx.seriesGenre.deleteMany({ where: { seriesId: dropId } });
    await tx.series.delete({ where: { id: dropId } });
  });
}
