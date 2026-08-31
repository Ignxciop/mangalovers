import {
  createMessage,
  checkMessageDuplicate,
} from "../chat/chatService.js";
import { checkRateLimit } from "../chat/chatRateLimiter.js";
import { MutedError } from "../utils/errors.js";
import logger from "../config/logger.js";

const CHAT_ROOM = "chat:global";
const MAX_CONTENT_LENGTH = 300;
const HTML_TAG_REGEX =
  /<([a-zA-Z][\w-]*)(?:\s[^>]*)?>[\s\S]*?<\/\1(?:\s[^>]*)?>|<(?:br|img|hr|input|meta|link|source)\b[^>]*?\/?>/i;

function getChatRoomSize(io) {
  return io.sockets.adapter.rooms.get(CHAT_ROOM)?.size ?? 0;
}

function emitOnlineCount(io) {
  io.to(CHAT_ROOM).emit("chat:online_count", {
    count: getChatRoomSize(io),
  });
}

function isValidContent(content) {
  if (typeof content !== "string") return false;
  const trimmed = content.trim();
  if (trimmed.length < 1 || trimmed.length > MAX_CONTENT_LENGTH) return false;
  return !HTML_TAG_REGEX.test(trimmed);
}

export function registerChatHandler(io, socket) {
  if (!socket.data.userId) return;

  socket.join(CHAT_ROOM);
  emitOnlineCount(io);

  socket.on("chat:send", (payload, ack) => {
    const respond = typeof ack === "function" ? ack : () => {};

    const content = payload?.content;
    const isSpoiler = Boolean(payload?.isSpoiler);
    const trimmed = typeof content === "string" ? content.trim() : "";

    if (!isValidContent(content)) {
      return respond({ ok: false, error: "INVALID_CONTENT" });
    }

    if (!checkRateLimit(socket.data.userId)) {
      return respond({ ok: false, error: "RATE_LIMITED" });
    }

    handleSend(io, socket.data.userId, trimmed, isSpoiler, respond);
  });

  socket.on("disconnect", () => {
    emitOnlineCount(io);
  });
}

async function handleSend(io, userId, content, isSpoiler, respond) {
  try {
    const isDuplicate = await checkMessageDuplicate(userId, content);
    if (isDuplicate) {
      return respond({ ok: false, error: "DUPLICATE_MESSAGE" });
    }

    const message = await createMessage(userId, content, isSpoiler);
    io.to(CHAT_ROOM).emit("chat:message", message);
    respond({ ok: true, message });
  } catch (err) {
    if (err instanceof MutedError) {
      return respond({ ok: false, error: "MUTED", mutedUntil: err.mutedUntil });
    }
    logger.error({ err }, "Error al crear mensaje de chat");
    respond({ ok: false, error: "INTERNAL_ERROR" });
  }
}