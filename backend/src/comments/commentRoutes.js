import { Router } from "express";
import {
  handleGetChapterComments,
  handleCreateComment,
  handleGetSeriesComments,
  handleCreateSeriesComment,
  handleGetCommentReplies,
  handleReplyToComment,
  handleUpdateComment,
  handleDeleteComment,
  handleToggleLike,
} from "./commentController.js";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../utils/validate.js";
import {
  chapterIdParamValidator,
  seriesIdParamValidator,
  commentIdParamValidator,
  createCommentValidator,
  replyCommentValidator,
  updateCommentValidator,
} from "./commentValidator.js";

const router = Router();

router.get(
  "/chapter/:chapterId",
  optionalAuthenticate,
  chapterIdParamValidator,
  validate,
  handleGetChapterComments,
);
router.post(
  "/chapter/:chapterId",
  authenticate,
  chapterIdParamValidator,
  createCommentValidator,
  validate,
  handleCreateComment,
);
router.get(
  "/series/:seriesId",
  optionalAuthenticate,
  seriesIdParamValidator,
  validate,
  handleGetSeriesComments,
);
router.post(
  "/series/:seriesId",
  authenticate,
  seriesIdParamValidator,
  createCommentValidator,
  validate,
  handleCreateSeriesComment,
);
router.get(
  "/:id/replies",
  optionalAuthenticate,
  commentIdParamValidator,
  validate,
  handleGetCommentReplies,
);
router.post(
  "/:id/reply",
  authenticate,
  commentIdParamValidator,
  replyCommentValidator,
  validate,
  handleReplyToComment,
);
router.patch(
  "/:id",
  authenticate,
  commentIdParamValidator,
  updateCommentValidator,
  validate,
  handleUpdateComment,
);
router.delete(
  "/:id",
  authenticate,
  commentIdParamValidator,
  validate,
  handleDeleteComment,
);
router.post(
  "/:id/like",
  authenticate,
  commentIdParamValidator,
  validate,
  handleToggleLike,
);

export default router;
