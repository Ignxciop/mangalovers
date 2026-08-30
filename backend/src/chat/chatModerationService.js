import { prisma } from "../config/prisma.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.js";
import { ActivityLogService } from "../activityLog/activityLogService.js";
import { emitChatEvent } from "../socket/chatEmitter.js";
import logger from "../config/logger.js";

export async function deleteChatMessage(adminId, messageId) {
  const message = await prisma.chatMessage.findFirst({
    where: { id: messageId },
    select: { id: true, content: true, userId: true, visible: true },
  });
  if (!message) throw new NotFoundError("Mensaje no encontrado");
  if (!message.visible) throw new ForbiddenError("El mensaje ya fue eliminado");

  await prisma.chatMessage.update({
    where: { id: messageId },
    data: { visible: false },
  });

  ActivityLogService.logEvent(adminId, "DELETE_CHAT_MESSAGE", {
    messageId,
    content: message.content.slice(0, 100),
    targetUserId: message.userId,
  }).catch((err) => logger.warn({ err }, "Error logging chat delete activity"));

  emitChatEvent("chat:message_deleted", { id: messageId });

  return { id: messageId };
}

export async function muteChatUser(adminId, userId, durationMinutes = null, reason = null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, lastname: true, alias: true },
  });
  if (!user) throw new NotFoundError("Usuario no encontrado");

  if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes < 1)) {
    throw new Error("Duración inválida");
  }

  const mutedUntil = durationMinutes !== null
    ? new Date(Date.now() + durationMinutes * 60_000)
    : null;

  const mute = await prisma.chatMute.upsert({
    where: { userId },
    create: {
      userId,
      mutedById: adminId,
      mutedUntil,
      reason,
    },
    update: {
      mutedById: adminId,
      mutedUntil,
      reason,
    },
    select: { userId: true, mutedUntil: true, reason: true },
  });

  const userName = user.alias || `${user.name} ${user.lastname || ""}`.trim();
  ActivityLogService.logEvent(adminId, "MUTE_CHAT_USER", {
    targetUserId: userId,
    targetUserName: userName,
    mutedUntil,
    permanent: mutedUntil === null,
    reason,
  }).catch((err) => logger.warn({ err }, "Error logging chat mute activity"));

  emitChatEvent("chat:user_muted", {
    userId,
    mutedUntil: mutedUntil ? mutedUntil.toISOString() : null,
    reason,
  });

  return {
    userId,
    mutedUntil: mutedUntil ? mutedUntil.toISOString() : null,
    reason,
  };
}

export async function unmuteChatUser(adminId, userId) {
  const existing = await prisma.chatMute.findUnique({ where: { userId } });
  if (!existing) throw new NotFoundError("El usuario no está silenciado");

  await prisma.chatMute.delete({ where: { userId } });

  ActivityLogService.logEvent(adminId, "UNMUTE_CHAT_USER", {
    targetUserId: userId,
  }).catch((err) => logger.warn({ err }, "Error logging chat unmute activity"));

  emitChatEvent("chat:user_unmuted", { userId });

  return { userId };
}