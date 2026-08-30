import { prisma } from "../config/prisma.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.js";
import { createNotification } from "../notifications/notificationService.js";
import { ActivityLogService } from "../activityLog/activityLogService.js";
import logger from "../config/logger.js";

const REPORT_USER_SELECT = {
  id: true,
  name: true,
  lastname: true,
  alias: true,
  avatarUrl: true,
};

function formatReport(r) {
  return {
    id: r.id,
    commentId: r.commentId,
    reason: r.reason,
    description: r.description,
    status: r.status,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
    adminNote: r.adminNote,
    reporter: r.reporter
      ? {
          id: r.reporter.id,
          name: r.reporter.name,
          lastname: r.reporter.lastname,
          alias: r.reporter.alias,
          avatarUrl: r.reporter.avatarUrl,
        }
      : null,
    resolvedBy: r.resolvedBy
      ? {
          id: r.resolvedBy.id,
          name: r.resolvedBy.name,
          lastname: r.resolvedBy.lastname,
        }
      : null,
    comment: r.comment
      ? {
          id: r.comment.id,
          content: r.comment.content.slice(0, 100),
          isSpoiler: r.comment.isSpoiler,
          chapterId: r.comment.chapterId,
          seriesId: r.comment.seriesId,
    series: r.comment.series
      ? { slug: r.comment.series.slug, name: r.comment.series.name }
      : r.comment.chapter?.series
        ? { slug: r.comment.chapter.series.slug, name: r.comment.chapter.series.name }
        : null,
    chapter: r.comment.chapter
      ? { name: r.comment.chapter.name }
      : null,
          user: r.comment.user
            ? { id: r.comment.user.id, alias: r.comment.user.alias }
            : null,
        }
      : null,
  };
}

export async function createReport(userId, commentId, reason, description = null) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, visible: true, userId: true, content: true, chapterId: true, seriesId: true },
  });
  if (!comment || !comment.visible) throw new NotFoundError("Comentario no encontrado");
  if (comment.userId === userId) {
    throw new ForbiddenError("No puedes reportar tu propio comentario");
  }

  const existing = await prisma.commentReport.findFirst({
    where: { commentId, reporterId: userId },
  });
  if (existing) {
    throw new ForbiddenError("Ya reportaste este comentario");
  }

  const report = await prisma.commentReport.create({
    data: { commentId, reporterId: userId, reason, description },
    include: {
      reporter: { select: REPORT_USER_SELECT },
      comment: {
        select: {
          id: true,
          content: true,
          isSpoiler: true,
          chapterId: true,
          seriesId: true,
          series: { select: { slug: true, name: true } },
          chapter: { select: { name: true, series: { select: { slug: true, name: true } } } },
          user: { select: { id: true, alias: true } },
        },
      },
    },
  });

  const commentPreview = comment.content.slice(0, 100);
  const metadata = {
    commentId,
    reason,
    content: commentPreview,
    reportedUserId: comment.userId,
    chapterId: comment.chapterId,
    seriesId: comment.seriesId,
  };

  ActivityLogService.logEvent(userId, "REPORT_COMMENT", metadata)
    .catch((err) => logger.warn({ err }, "Error logging report activity"));

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  for (const admin of admins) {
    createNotification({
      userId: admin.id,
      type: "NEW_REPORT",
      title: "Nuevo reporte de comentario",
      body: `Se reportó un comentario${commentPreview ? `: "${commentPreview}"` : ""} (${reason})`,
      data: {
        reportId: report.id,
        commentId: comment.id,
        reason,
      },
    }).catch((err) => logger.warn({ err }, "Error sending report notification"));
  }

  return formatReport(report);
}

export async function getReports(page = 1, limit = 20, filters = {}) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.reason) where.reason = filters.reason;

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.commentReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        reporter: { select: REPORT_USER_SELECT },
        resolvedBy: { select: { id: true, name: true, lastname: true } },
        comment: {
          select: {
            id: true,
            content: true,
            isSpoiler: true,
            chapterId: true,
            seriesId: true,
            series: { select: { slug: true, name: true } },
            chapter: { select: { name: true, series: { select: { slug: true, name: true } } } },
            user: { select: { id: true, alias: true } },
          },
        },
      },
    }),
    prisma.commentReport.count({ where }),
  ]);

  return {
    data: data.map(formatReport),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getPendingCount() {
  return prisma.commentReport.count({ where: { status: "PENDING" } });
}

export async function resolveReport(adminId, reportId, status, adminNote = null) {
  const report = await prisma.commentReport.findUnique({ where: { id: reportId } });
  if (!report) throw new NotFoundError("Reporte no encontrado");

  if (report.status !== "PENDING") {
    throw new ForbiddenError("Este reporte ya fue procesado");
  }

  const validStatuses = ["REVIEWED", "DISMISSED", "RESOLVED"];
  if (!validStatuses.includes(status)) {
    throw new Error("Estado inválido");
  }

  const updated = await prisma.commentReport.update({
    where: { id: reportId },
    data: {
      status,
      resolvedById: adminId,
      resolvedAt: new Date(),
      adminNote,
    },
    include: {
      reporter: { select: REPORT_USER_SELECT },
      resolvedBy: { select: { id: true, name: true, lastname: true } },
      comment: {
        select: {
          id: true,
          content: true,
          isSpoiler: true,
          chapterId: true,
          seriesId: true,
          series: { select: { slug: true, name: true } },
          chapter: { select: { name: true, series: { select: { slug: true, name: true } } } },
          user: { select: { id: true, alias: true } },
        },
      },
    },
  });

  return formatReport(updated);
}
