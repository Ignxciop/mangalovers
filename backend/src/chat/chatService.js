import { prisma } from "../config/prisma.js";
import { NotFoundError, MutedError } from "../utils/errors.js";

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

  const nextCursor = messages.length === safeLimit
    ? Math.min(...messages.map((m) => m.id))
    : null;

  return { messages: messages.map(formatMessage), nextCursor };
}

export async function checkMessageDuplicate(userId, content) {
  const normalized = content.trim().toLowerCase();
  const last = await prisma.chatMessage.findFirst({
    where: { userId, visible: true },
    orderBy: { id: "desc" },
    take: 1,
    select: { content: true },
  });
  return last ? last.content.trim().toLowerCase() === normalized : false;
}

async function assertUserCanChat(user) {
  if (user.status !== "ACTIVE") {
    if (
      user.status === "SUSPENDED" &&
      user.suspendedUntil &&
      new Date(user.suspendedUntil) <= new Date()
    ) {
      await prisma.user.update({
        where: { id: user.id },
        data: { status: "ACTIVE", suspendedUntil: null },
      });
      return;
    }
    const mutedUntil =
      user.status === "SUSPENDED" ? user.suspendedUntil : null;
    throw new MutedError(
      "No puedes enviar mensajes al chat",
      mutedUntil,
      user.status === "BANNED" ? "banned" : "suspended",
    );
  }

  const mute = await prisma.chatMute.findUnique({ where: { userId: user.id } });
  if (mute && (mute.mutedUntil === null || new Date(mute.mutedUntil) > new Date())) {
    throw new MutedError(
      "Estás silenciado en el chat",
      mute.mutedUntil,
      "chat_mute",
    );
  }
}

export async function createMessage(userId, content, isSpoiler = false) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      suspendedUntil: true,
      ...CHAT_USER_SELECT,
    },
  });
  if (!user) throw new NotFoundError("Usuario no encontrado");

  await assertUserCanChat(user);

  const message = await prisma.chatMessage.create({
    data: { userId, content, isSpoiler },
    include: { user: { select: CHAT_USER_SELECT } },
  });

  return formatMessage(message);
}