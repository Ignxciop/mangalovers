import { AdminToolsService } from "./adminToolsService.js";

export async function fixEmptyChapters(req, res, next) {
  try {
    const result = await AdminToolsService.fixEmptyChapters();
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
