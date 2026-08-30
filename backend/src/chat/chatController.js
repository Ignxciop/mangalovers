import { getMessages } from "./chatService.js";

export async function handleGetMessages(req, res, next) {
  try {
    const cursor = req.query.cursor !== undefined
      ? Number(req.query.cursor)
      : undefined;
    const limit = Number(req.query.limit) || 30;
    const result = await getMessages(cursor, limit);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}