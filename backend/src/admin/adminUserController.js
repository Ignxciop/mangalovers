import { AdminUserService } from "./adminUserService.js";
import { ActivityLogService } from "../activityLog/activityLogService.js";
import logger from "../config/logger.js";

export async function listUsers(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const filters = {};
    if (req.query.search) filters.search = req.query.search;
    if (req.query.role) filters.role = req.query.role;
    if (req.query.status) filters.status = req.query.status;

    const result = await AdminUserService.listUsers(page, limit, filters);
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    next(error);
  }
}

export async function updateRole(req, res, next) {
  try {
    const targetUserId = req.params.id;
    const { role } = req.body;
    const existing = await AdminUserService.getUserBasicInfo(targetUserId);
    const user = await AdminUserService.updateRole(targetUserId, role, req.user.userId);
    res.json({ success: true, message: "Rol actualizado", data: user });

    const targetName = `${existing.name} ${existing.lastname}`;
    ActivityLogService.logEvent(
      req.user.userId, "UPDATE_ROLE",
      { targetUserId, targetUserName: targetName, oldRole: existing?.role, newRole: role },
      req.ip, req.headers["user-agent"],
    ).catch((err) => logger.warn({ err, userId: req.user.userId, event: "UPDATE_ROLE" }, "ActivityLog error"));
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const targetUserId = req.params.id;
    const { status, suspendedUntil } = req.body;
    const existing = await AdminUserService.getUserBasicInfo(targetUserId);
    const user = await AdminUserService.updateStatus(targetUserId, status, req.user.userId, suspendedUntil);
    res.json({ success: true, message: "Estado actualizado", data: user });

    const targetName = `${existing.name} ${existing.lastname}`;
    const meta = { targetUserId, targetUserName: targetName, oldStatus: existing?.status, newStatus: status };
    if (status === "SUSPENDED" && suspendedUntil) {
      meta.suspendedUntil = suspendedUntil;
    }
    ActivityLogService.logEvent(
      req.user.userId, "UPDATE_USER_STATUS",
      meta,
      req.ip, req.headers["user-agent"],
    ).catch((err) => logger.warn({ err, userId: req.user.userId, event: "UPDATE_USER_STATUS" }, "ActivityLog error"));
  } catch (error) {
    next(error);
  }
}

export async function getStatusHistory(req, res, next) {
  try {
    const history = await AdminUserService.getStatusHistory(req.params.id);
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
}
