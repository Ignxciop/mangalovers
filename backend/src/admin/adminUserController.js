import { AdminUserService } from "./adminUserService.js";

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
  } catch (error) {
    next(error);
  }
}
