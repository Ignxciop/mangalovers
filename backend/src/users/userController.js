import { UserService } from "./userService.js";

export async function getProfile(req, res, next) {
  try {
    const viewerId = req.user?.userId ?? null;
    const profile = await UserService.getProfileByAlias(req.params.alias, viewerId);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

export async function getProfileFavorites(req, res, next) {
  try {
    const viewerId = req.user?.userId ?? null;
    const favorites = await UserService.getProfileFavorites(req.params.alias, viewerId);
    res.json({ success: true, data: favorites });
  } catch (error) {
    next(error);
  }
}

export async function getProfileActivity(req, res, next) {
  try {
    const viewerId = req.user?.userId ?? null;
    const page = Math.max(1, parseInt(req.query.page ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit ?? "20", 10)));
    const result = await UserService.getProfileActivity(req.params.alias, viewerId, page, limit);
    res.json({ success: true, data: result.data, total: result.total, page, limit });
  } catch (error) {
    next(error);
  }
}
