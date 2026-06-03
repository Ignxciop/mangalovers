import {
  getChapterComments,
  createComment,
  replyToComment,
  updateComment,
  deleteComment,
  toggleLike,
} from "./commentService.js";

export async function handleGetChapterComments(req, res, next) {
  try {
    const chapterId = Number(req.params.chapterId);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const currentUserId = req.user?.userId ?? null;

    const result = await getChapterComments(chapterId, currentUserId, page, limit);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateComment(req, res, next) {
  try {
    const chapterId = Number(req.params.chapterId);
    const { content, isSpoiler } = req.body;
    const comment = await createComment(req.user.userId, chapterId, content, isSpoiler);
    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
}

export async function handleReplyToComment(req, res, next) {
  try {
    const commentId = Number(req.params.id);
    const { content, isSpoiler } = req.body;
    const reply = await replyToComment(req.user.userId, commentId, content, isSpoiler);
    res.status(201).json({ success: true, data: reply });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateComment(req, res, next) {
  try {
    const commentId = Number(req.params.id);
    const { content, isSpoiler } = req.body;
    const comment = await updateComment(req.user.userId, commentId, content, isSpoiler, req.user.role);
    res.json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteComment(req, res, next) {
  try {
    const commentId = Number(req.params.id);
    await deleteComment(req.user.userId, commentId, req.user.role);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function handleToggleLike(req, res, next) {
  try {
    const commentId = Number(req.params.id);
    const result = await toggleLike(req.user.userId, commentId);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
