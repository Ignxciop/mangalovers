import {
  getUserFavorites, getFavorite, upsertFavorite, deleteFavorite, getSeriesBasicInfo, getUserFavoritesPaginated,
} from "./favoriteService.js";
import { ActivityLogService } from "../activityLog/activityLogService.js";
import logger from "../config/logger.js";

export async function handleGetFavorites(req, res, next) {
  try {
    const { page, limit } = req.query;

    if (limit) {
      const capped = Math.min(Number(limit), 32);
      const result = await getUserFavoritesPaginated(req.user.userId, Number(page ?? 1), capped);
      return res.json(result);
    }

    const favorites = await getUserFavorites(req.user.userId);
    res.json(favorites);
  } catch (error) {
    next(error);
  }
}

export async function handleGetFavorite(req, res, next) {
  try {
    const favorite = await getFavorite(req.user.userId, req.params.seriesId);
    res.json(favorite ?? null);
  } catch (error) {
    next(error);
  }
}

export async function handleUpsertFavorite(req, res, next) {
  try {
    const { seriesId, status = "Siguiendo" } = req.body;
    const existing = await getFavorite(req.user.userId, seriesId);
    const favorite = await upsertFavorite(req.user.userId, seriesId, status);
    res.json(favorite);

    if (!existing) {
      const series = await getSeriesBasicInfo(Number(seriesId));
      ActivityLogService.logEvent(
        req.user.userId, "ADD_FAVORITE",
        { seriesId: Number(seriesId), seriesName: series?.name ?? null },
        req.ip, req.headers["user-agent"],
      ).catch((err) => logger.warn({ err, userId: req.user.userId, event: "ADD_FAVORITE" }, "ActivityLog error"));
    }
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteFavorite(req, res, next) {
  try {
    const series = await getSeriesBasicInfo(Number(req.params.seriesId));
    await deleteFavorite(req.user.userId, req.params.seriesId);
    res.json({ success: true });

    ActivityLogService.logEvent(
      req.user.userId, "REMOVE_FAVORITE",
      { seriesId: Number(req.params.seriesId), seriesName: series?.name ?? null },
      req.ip, req.headers["user-agent"],
    ).catch((err) => logger.warn({ err, userId: req.user.userId, event: "REMOVE_FAVORITE" }, "ActivityLog error"));
  } catch (error) {
    next(error);
  }
}
