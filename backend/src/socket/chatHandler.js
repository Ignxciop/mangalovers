import { createMessage } from "../chat/chatService.js";
import logger from "../config/logger.js";

const CHAT_ROOM = "chat:global";
const MAX_CONTENT_LENGTH = 300;
const HTML_TAG_REGEX = /<\/?[a-zA-Z][^>]*>/;

function isValidContent(content) {
  if (typeof content !== "string") return false;
  const trimmed = content.trim();
  if (trimmed.length < 1 || trimmed.length > MAX_CONTENT_LENGTH) return false;
  return !HTML_TAG_REGEX.test(trimmed);
}

export function registerChatHandler(io, socket) {
  if (!socket.data.userId) return;

  socket.join(CHAT_ROOM);

  socket.on("chat:send", (payload, ack) => {
    const respond = typeof ack === "function" ? ack : () => {};

    const content = payload?.content;
    const isSpoiler = Boolean(payload?.isSpoiler);

    if (!isValidContent(content)) {
      return respond({ ok: false, error: "INVALID_CONTENT" });
    }

    // TODO fase 4: rate limit + chequeo de mute
    createMessage(socket.data.userId, content.trim(), isSpoiler)
      .then((message) => {
        io.to(CHAT_ROOM).emit("chat:message", message);
        respond({ ok: true, message });
      })
      .catch((err) => {
        logger.error({ err }, "Error al crear mensaje de chat");
        respond({ ok: false, error: "INTERNAL_ERROR" });
      });
  });
}