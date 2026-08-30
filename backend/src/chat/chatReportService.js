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

const VALID_RESOLUTION_STATUSES = ["REVIEWED", "DISMISSED", "RESOLVED"];

function formatReport(r) {
  return {
    id: r.id,
    messageId: r.messageId,
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
    message: r.message
      ? {
          id: r.message.id,
          content: r.message.content.slice(0, 100),
          isSpoiler: r.message.isSpoiler,
          visible: r.message.visible,
          createdAt: r.message.createdAt,
          user: r.message.user
            ? { id: r.message.user.id, alias: r.message.user.alias }
            : null,
        }
      : null,
  };
}

export async function createChatReport(userId, messageId, reason, description = null) {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: { id: true, visible: true, userId: true, content: true },
  });
  if (!message || !message.visible) throw new NotFoundError("Mensaje no encontrado");
  if (message.userId === userId) {
    throw new ForbiddenError("No puedes reportar tu propio mensaje");
  }

  const existing = await prisma.chatMessageReport.findFirst({
    where: { messageId, reporterId: userId },
  });
  if (existing) {
    throw new ForbiddenError("Ya reportaste este mensaje");
  }

  const report = await prisma.chatMessageReport.create({
    data: { messageId, reporterId: userId, reason, description },
    include: {
      reporter: { select: REPORT_USER_SELECT },
      message: {
        select: {
          id: true,
          content: true,
          isSpoiler: true,
          visible: true,
          createdAt: true,
          user: { select: { id: true, alias: true } },
        },
      },
    },
  });

  const metadata = {
    messageId,
    reason,
    content: message.content.slice(0, 100),
    reportedUserId: message.userId,
  };

  ActivityLogService.logEvent(userId, "REPORT_CHAT_MESSAGE", metadata)
    .catch((err) => logger.warn({ err }, "Error logging chat report activity"));

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  for (const admin of admins) {
    createNotification({
      userId: admin.id,
      type: "NEW_REPORT",
      title: "Nuevo reporte en el chat",
      body: `Se reportó un mensaje${metadata.content ? `: "${metadata.content}"` : ""} (${reason})`,
      data: {
        reportId: report.id,
        messageId: message.id,
        reason,
      },
    }).catch((err) => logger.warn({ err }, "Error sending chat report notification"));
  }

  return formatReport(report);
}

export async function getChatReports(page = 1, limit = 20, filters = {}) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.reason) where.reason = filters.reason;

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.chatMessageReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        reporter: { select: REPORT_USER_SELECT },
        resolvedBy: { select: { id: true, name: true, lastname: true } },
        message: {
          select: {
            id: true,
            content: true,
            isSpoiler: true,
            visible: true,
            createdAt: true,
            user: { select: { id: true, alias: true } },
          },
        },
      },
    }),
    prisma.chatMessageReport.count({ where }),
  ]);

  return {
    data: data.map(formatReport),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getChatPendingCount() {
  return prisma.chatMessageReport.count({ where: { status: "PENDING" } });
}

export async function resolveChatReport(adminId, reportId, status, adminNote = null) {
  const report = await prisma.chatMessageReport.findUnique({ where: { id: reportId } });
  if (!report) throw new NotFoundError("Reporte no encontrado");

  if (report.status !== "PENDING") {
    throw new ForbiddenError("Este reporte ya fue procesado");
  }

  if (!VALID_RESOLUTION_STATUSES.includes(status)) {
    throw new Error("Estado inválido");
  }

  const updated = await prisma.chatMessageReport.update({
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
      message: {
        select: {
          id: true,
          content: true,
          isSpoiler: true,
          visible: true,
          createdAt: true,
          user: { select: { id: true, alias: true } },
        },
      },
    },
  });

  return formatReport(updated);
}