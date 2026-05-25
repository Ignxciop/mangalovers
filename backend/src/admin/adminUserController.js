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
    const user = await AdminUserService.updateRole(targetUserId, role, req.user.userId);
    res.json({ success: true, message: "Rol actualizado", data: user });

    ActivityLogService.logEvent(
      req.user.userId, "UPDATE_ROLE",
      { targetUserId, oldRole: user.role, newRole: role },
      req.ip, req.headers["user-agent"],
    ).catch((err) => logger.warn({ err, userId: req.user.userId, event: "UPDATE_ROLE" }, "ActivityLog error"));
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const targetUserId = req.params.id;
    const { status } = req.body;
    const user = await AdminUserService.updateStatus(targetUserId, status, req.user.userId);
    res.json({ success: true, message: "Estado actualizado", data: user });

    ActivityLogService.logEvent(
      req.user.userId, "UPDATE_USER_STATUS",
      { targetUserId, newStatus: status },
      req.ip, req.headers["user-agent"],
    ).catch((err) => logger.warn({ err, userId: req.user.userId, event: "UPDATE_USER_STATUS" }, "ActivityLog error"));
  } catch (error) {
    next(error);
  }
}
