import { getMessages, getSelfMute } from "./chatService.js";
import { createChatReport } from "./chatReportService.js";

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

export async function handleGetSelfMute(req, res, next) {
  try {
    const mute = await getSelfMute(req.user.userId);
    res.json({ success: true, data: mute });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateChatReport(req, res, next) {
  try {
    const messageId = Number(req.params.messageId);
    const { reason, description } = req.body;
    const report = await createChatReport(req.user.userId, messageId, reason, description);
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}