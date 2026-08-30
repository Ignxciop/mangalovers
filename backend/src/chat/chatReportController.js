import {
  createChatReport,
  getChatReports,
  getChatPendingCount,
  resolveChatReport,
} from "./chatReportService.js";

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

export async function handleGetChatReports(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.reason) filters.reason = req.query.reason;

    const result = await getChatReports(page, limit, filters);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function handleGetChatPendingCount(req, res, next) {
  try {
    const count = await getChatPendingCount();
    res.json({ success: true, count });
  } catch (error) {
    next(error);
  }
}

export async function handleResolveChatReport(req, res, next) {
  try {
    const reportId = Number(req.params.id);
    const { status, adminNote } = req.body;
    const report = await resolveChatReport(req.user.userId, reportId, status, adminNote);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}