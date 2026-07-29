import {
  createReport,
  getReports,
  getPendingCount,
  resolveReport,
} from "./commentReportService.js";

export async function handleCreateReport(req, res, next) {
  try {
    const commentId = Number(req.params.id);
    const { reason, description } = req.body;
    const report = await createReport(req.user.userId, commentId, reason, description);
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}

export async function handleGetReports(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.reason) filters.reason = req.query.reason;

    const result = await getReports(page, limit, filters);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function handleGetPendingCount(req, res, next) {
  try {
    const count = await getPendingCount();
    res.json({ success: true, count });
  } catch (error) {
    next(error);
  }
}

export async function handleResolveReport(req, res, next) {
  try {
    const reportId = Number(req.params.id);
    const { status, adminNote } = req.body;
    const report = await resolveReport(req.user.userId, reportId, status, adminNote);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}
