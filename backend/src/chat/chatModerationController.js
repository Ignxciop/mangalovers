import {
  deleteChatMessage,
  muteChatUser,
  unmuteChatUser,
} from "./chatModerationService.js";

export async function handleDeleteChatMessage(req, res, next) {
  try {
    const messageId = Number(req.params.id);
    const result = await deleteChatMessage(req.user.userId, messageId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function handleMuteChatUser(req, res, next) {
  try {
    const { userId, durationMinutes, reason } = req.body;
    const data = await muteChatUser(
      req.user.userId,
      userId,
      durationMinutes ?? null,
      reason ?? null,
    );
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function handleUnmuteChatUser(req, res, next) {
  try {
    const { userId } = req.params;
    const data = await unmuteChatUser(req.user.userId, userId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}