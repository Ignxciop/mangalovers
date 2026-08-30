import { prisma } from "../config/prisma.js";
import { NotFoundError } from "../utils/errors.js";

const CHAT_USER_SELECT = {
  id: true,
  alias: true,
  avatarUrl: true,
};

function formatMessage(m) {
  return {
    id: m.id,
    content: m.content,
    isSpoiler: m.isSpoiler,
    createdAt: m.createdAt,
    user: m.user
      ? {
          id: m.user.id,
          alias: m.user.alias,
          avatarUrl: m.user.avatarUrl,
        }
      : null,
  };
}

export async function getMessages(cursor, limit = 30) {
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 50);
  const where = { visible: true };
  if (cursor !== undefined && cursor !== null) {
    where.id = { lt: Number(cursor) };
  }

  const messages = await prisma.chatMessage.findMany({
    where,
    orderBy: { id: "desc" },
    take: safeLimit,
    include: { user: { select: CHAT_USER_SELECT } },
  });

  const nextCursor = messages.length > 0
    ? Math.min(...messages.map((m) => m.id))
    : null;

  return { messages: messages.map(formatMessage), nextCursor };
}

export async function createMessage(userId, content, isSpoiler = false) {
  // TODO fase 4: chequear mute/ban antes de crear
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: CHAT_USER_SELECT,
  });
  if (!user) throw new NotFoundError("Usuario no encontrado");

  const message = await prisma.chatMessage.create({
    data: { userId, content, isSpoiler },
    include: { user: { select: CHAT_USER_SELECT } },
  });

  return formatMessage(message);
}