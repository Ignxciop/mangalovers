import {
  getReadChapterIds, toggleChapterRead,
  markChaptersUntil, getUserReadingStats, getFullStats,
  upsertChapterProgress, getChapterProgress, getSeriesProgress,
} from "./readService.js";
import { ActivityLogService } from "../activityLog/activityLogService.js";
import logger from "../config/logger.js";

export async function handleGetReadChapters(req, res, next) {
  try {
    const { seriesId } = req.params;
    const ids = await getReadChapterIds(req.user.userId, seriesId);
    res.json(ids);
  } catch (error) {
    next(error);
  }
}

export async function handleToggleChapterRead(req, res, next) {
  try {
    const userId = req.user.userId;
    const chapterId = Number(req.params.chapterId);
    const result = await toggleChapterRead(userId, chapterId);
    res.json(result);

    if (result.newChapters && result.newChapters.length > 0) {
      for (const ch of result.newChapters) {
        try {
          await ActivityLogService.logEvent(
            userId, "MARK_READ",
            { chapterId: ch.id, chapterName: ch.name, seriesId: result.seriesId, seriesName: result.seriesName },
            req.ip, req.headers["user-agent"],
          );
        } catch (err) {
          logger.warn({ err, userId, event: "MARK_READ" }, "ActivityLog error");
        }
      }
    }
  } catch (error) {
    next(error);
  }
}

export async function handleMarkChaptersUntil(req, res, next) {
  try {
    const { chapterId } = req.params;
    const result = await markChaptersUntil(req.user.userId, chapterId);
    res.json(result);

    if (result.newChapters && result.newChapters.length > 0) {
      for (const ch of result.newChapters) {
        try {
          await ActivityLogService.logEvent(
            req.user.userId, "MARK_READ",
            { chapterId: ch.id, chapterName: ch.name, seriesId: result.seriesId, seriesName: result.seriesName },
            req.ip, req.headers["user-agent"],
          );
        } catch (err) {
          logger.warn({ err, userId: req.user.userId, event: "MARK_READ" }, "ActivityLog error");
        }
      }
    }
  } catch (error) {
    next(error);
  }
}

export async function handleGetReadingStats(req, res, next) {
  try {
    const stats = await getUserReadingStats(req.user.userId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

export async function handleGetFullStats(req, res, next) {
  try {
    const stats = await getFullStats(req.user.userId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

export async function handleUpsertProgress(req, res, next) {
  try {
    const { chapterId } = req.params;
    const { pageNumber, percentage } = req.body;
    const result = await upsertChapterProgress(req.user.userId, chapterId, { pageNumber, percentage });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleGetChapterProgress(req, res, next) {
  try {
    const { chapterId } = req.params;
    const progress = await getChapterProgress(req.user.userId, chapterId);
    res.json(progress);
  } catch (error) {
    next(error);
  }
}

export async function handleGetSeriesProgress(req, res, next) {
  try {
    const { seriesId } = req.params;
    const progress = await getSeriesProgress(req.user.userId, seriesId);
    res.json(progress);
  } catch (error) {
    next(error);
  }
}
