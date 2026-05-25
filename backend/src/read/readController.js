import {
  getReadChapterIds, toggleChapterRead,
  markChaptersUntil, getUserReadingStats, getFullStats,
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
  } catch (error) {
    next(error);
  }
}

export async function handleMarkChaptersUntil(req, res, next) {
  try {
    const { chapterId } = req.params;
    const result = await markChaptersUntil(req.user.userId, chapterId);
    res.json(result);

    ActivityLogService.logEvent(
      req.user.userId, "MARK_READ",
      {
        chapterId: Number(chapterId),
        seriesId: result.seriesId,
        seriesName: result.seriesName,
        count: result.updated,
      },
      req.ip, req.headers["user-agent"],
    ).catch((err) => logger.warn({ err, userId: req.user.userId, event: "MARK_READ" }, "ActivityLog error"));
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
