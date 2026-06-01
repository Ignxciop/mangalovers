import { AdminAnnouncementService } from "./adminAnnouncementService.js";
import { ActivityLogService } from "../activityLog/activityLogService.js";
import logger from "../config/logger.js";

export async function listAnnouncements(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const filters = {};
    if (req.query.search) filters.search = req.query.search;
    if (req.query.active !== undefined) filters.active = req.query.active;

    const result = await AdminAnnouncementService.list(page, limit, filters);
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    next(error);
  }
}

export async function getAnnouncement(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const announcement = await AdminAnnouncementService.getById(id);
    res.json({ success: true, data: announcement });
  } catch (error) {
    next(error);
  }
}

export async function createAnnouncement(req, res, next) {
  try {
    const announcement = await AdminAnnouncementService.create(req.body);
    res.status(201).json({ success: true, data: announcement });

    ActivityLogService.logEvent(
      req.user.userId, "CREATE_ANNOUNCEMENT",
      { announcementId: announcement.id, title: announcement.title },
      req.ip, req.headers["user-agent"],
    ).catch((err) => logger.warn({ err, event: "CREATE_ANNOUNCEMENT" }, "ActivityLog error"));
  } catch (error) {
    next(error);
  }
}

export async function updateAnnouncement(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const announcement = await AdminAnnouncementService.update(id, req.body);
    res.json({ success: true, data: announcement });

    ActivityLogService.logEvent(
      req.user.userId, "UPDATE_ANNOUNCEMENT",
      { announcementId: id },
      req.ip, req.headers["user-agent"],
    ).catch((err) => logger.warn({ err, event: "UPDATE_ANNOUNCEMENT" }, "ActivityLog error"));
  } catch (error) {
    next(error);
  }
}

export async function deleteAnnouncement(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    await AdminAnnouncementService.delete(id);
    res.json({ success: true, message: "Anuncio eliminado" });

    ActivityLogService.logEvent(
      req.user.userId, "DELETE_ANNOUNCEMENT",
      { announcementId: id },
      req.ip, req.headers["user-agent"],
    ).catch((err) => logger.warn({ err, event: "DELETE_ANNOUNCEMENT" }, "ActivityLog error"));
  } catch (error) {
    next(error);
  }
}
