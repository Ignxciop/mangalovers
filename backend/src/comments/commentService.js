import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.js";
import { resolveCanonicalChapterId, resolveCanonicalSeriesId } from "../manga/seriesCluster.js";
import { createNotification } from "../notifications/notificationService.js";
import { ActivityLogService } from "../activityLog/activityLogService.js";
import logger from "../config/logger.js";

const COMMENT_USER_SELECT = {
  id: true,
  name: true,
  lastname: true,
  alias: true,
  avatarUrl: true,
};

function baseCommentInclude(currentUserId, includeRepliesCount = false) {
  return {
    user: { select: COMMENT_USER_SELECT },
    _count: {
      select: {
        likes: true,
        ...(includeRepliesCount && { replies: true }),
      },
    },
    likes: currentUserId
      ? { where: { userId: currentUserId }, select: { userId: true } }
      : false,
  };
}

function topLevelInclude(currentUserId) {
  return {
    ...baseCommentInclude(currentUserId, true),
  };
}

function formatComment(c, currentUserId, totalReplyCountOverride) {
  return {
    id: c.id,
    content: c.content,
    isSpoiler: c.isSpoiler,
    parentId: c.parentId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    isEdited: new Date(c.updatedAt) > new Date(c.createdAt),
    user: c.user
      ? {
          id: c.user.id,
          alias: c.user.alias,
          avatarUrl: c.user.avatarUrl,
        }
      : null,
    likeCount: c._count?.likes ?? 0,
    replyCount: c._count?.replies ?? 0,
    totalReplyCount: totalReplyCountOverride ?? c._count?.replies ?? 0,
    isLikedByMe: currentUserId
      ? c.likes?.some((l) => l.userId === currentUserId) ?? false
      : false,
    replies: c.replies?.map((r) => formatComment(r, currentUserId)) ?? [],
  };
}

function buildCommentTree(comments, currentUserId) {
  const map = new Map();
  const roots = [];

  for (const c of comments) {
    map.set(c.id, formatComment(c, currentUserId));
  }

  for (const c of comments) {
    const node = map.get(c.id);
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId).replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

async function computeTotalReplyCounts(commentIds) {
  if (!commentIds.length) return new Map();

  const rows = await prisma.$queryRaw`
    WITH RECURSIVE reply_tree AS (
      SELECT id, "parentId" AS root_id FROM "comments"
      WHERE "parentId" IN (${Prisma.join(commentIds)}) AND visible = true
      UNION ALL
      SELECT c.id, rt.root_id FROM "comments" c
      INNER JOIN reply_tree rt ON c."parentId" = rt.id
      WHERE c.visible = true
    )
    SELECT root_id, COUNT(*)::int AS total FROM reply_tree GROUP BY root_id
  `;

  const map = new Map();
  for (const row of rows) {
    map.set(Number(row.root_id), Number(row.total));
  }
  return map;
}

export async function getChapterComments(chapterId, currentUserId, page = 1, limit = 10) {
  const canonicalChapterId = await resolveCanonicalChapterId(chapterId);
  const where = { chapterId: canonicalChapterId, visible: true };
  const skip = (page - 1) * limit;

  const [topLevel, total] = await Promise.all([
    prisma.comment.findMany({
      where: { ...where, parentId: null },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: topLevelInclude(currentUserId),
    }),
    prisma.comment.count({ where: { ...where, parentId: null } }),
  ]);

  const totalReplyCounts = await computeTotalReplyCounts(topLevel.map((c) => c.id));

  return {
    data: topLevel.map((c) => formatComment(c, currentUserId, totalReplyCounts.get(c.id) ?? 0)),
    total,
    page,
    limit,
  };
}

export async function createComment(userId, chapterId, content, isSpoiler = false) {
  const canonicalChapterId = await resolveCanonicalChapterId(chapterId);
  const chapter = await prisma.chapter.findUnique({
    where: { id: canonicalChapterId },
    select: { id: true, name: true, series: { select: { slug: true, name: true } } },
  });
  if (!chapter) throw new NotFoundError("Capítulo no encontrado");

  const comment = await prisma.comment.create({
    data: { userId, chapterId: canonicalChapterId, content, isSpoiler },
    include: {
      user: { select: COMMENT_USER_SELECT },
      _count: { select: { likes: true } },
      likes: { where: { userId }, select: { userId: true } },
    },
  });

  ActivityLogService.logEvent(userId, "CREATE_COMMENT", {
    chapterId: canonicalChapterId,
    commentId: comment.id,
    content: comment.content.slice(0, 100),
    seriesName: chapter.series?.name ?? null,
    seriesSlug: chapter.series?.slug ?? null,
    chapterName: chapter.name,
  }).catch((err) => logger.warn({ err }, "Error logging create comment activity"));

  return formatComment(comment, userId);
}

export async function getSeriesComments(seriesId, currentUserId, page = 1, limit = 10) {
  const canonicalSeriesId = await resolveCanonicalSeriesId(seriesId);
  const where = { seriesId: canonicalSeriesId, visible: true };
  const skip = (page - 1) * limit;

  const [topLevel, total] = await Promise.all([
    prisma.comment.findMany({
      where: { ...where, parentId: null },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: topLevelInclude(currentUserId),
    }),
    prisma.comment.count({ where: { ...where, parentId: null } }),
  ]);

  const totalReplyCounts = await computeTotalReplyCounts(topLevel.map((c) => c.id));

  return {
    data: topLevel.map((c) => formatComment(c, currentUserId, totalReplyCounts.get(c.id) ?? 0)),
    total,
    page,
    limit,
  };
}

export async function getCommentReplies(parentId, currentUserId, offset = 0, limit = 5) {
  const [replies, total] = await Promise.all([
    prisma.comment.findMany({
      where: { parentId, visible: true },
      orderBy: { createdAt: "asc" },
      skip: offset,
      take: limit,
      include: baseCommentInclude(currentUserId, true),
    }),
    prisma.comment.count({ where: { parentId, visible: true } }),
  ]);

  const totalReplyCounts = await computeTotalReplyCounts(replies.map((r) => r.id));
  const data = replies.map((c) => {
    const formatted = formatComment(c, currentUserId);
    formatted.totalReplyCount = totalReplyCounts.get(c.id) ?? 0;
    return formatted;
  });

  return { data, total, offset, limit };
}

export async function createSeriesComment(userId, seriesId, content, isSpoiler = false) {
  const canonicalSeriesId = await resolveCanonicalSeriesId(seriesId);
  const series = await prisma.series.findUnique({
    where: { id: canonicalSeriesId },
    select: { id: true, name: true, slug: true },
  });
  if (!series) throw new NotFoundError("Serie no encontrada");

  const comment = await prisma.comment.create({
    data: { userId, seriesId: canonicalSeriesId, content, isSpoiler },
    include: {
      user: { select: COMMENT_USER_SELECT },
      _count: { select: { likes: true } },
      likes: { where: { userId }, select: { userId: true } },
    },
  });

  ActivityLogService.logEvent(userId, "CREATE_COMMENT", {
    seriesId: canonicalSeriesId,
    commentId: comment.id,
    content: comment.content.slice(0, 100),
    seriesName: series.name,
    seriesSlug: series.slug,
  }).catch((err) => logger.warn({ err }, "Error logging create series comment activity"));

  return formatComment(comment, userId);
}

export async function replyToComment(userId, commentId, content, isSpoiler = false) {
  const parent = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      visible: true,
      userId: true,
      id: true,
      userId: true,
      chapterId: true,
      seriesId: true,
      chapter: { select: { name: true, series: { select: { slug: true, name: true } } } },
      series: { select: { name: true, slug: true } },
      user: { select: { alias: true, name: true, lastname: true } },
    },
  });
  if (!parent) throw new NotFoundError("Comentario no encontrado");
  if (!parent.visible) throw new NotFoundError("Comentario no encontrado");

  const canonicalChapterId = parent.chapterId
    ? await resolveCanonicalChapterId(parent.chapterId)
    : null;
  const canonicalSeriesId = parent.seriesId
    ? await resolveCanonicalSeriesId(parent.seriesId)
    : null;

  const reply = await prisma.comment.create({
    data: {
      userId,
      chapterId: canonicalChapterId,
      seriesId: canonicalSeriesId,
      parentId: commentId,
      content,
      isSpoiler,
    },
    include: {
      user: { select: COMMENT_USER_SELECT },
      _count: { select: { likes: true } },
      likes: { where: { userId }, select: { userId: true } },
    },
  });

  if (parent.userId !== userId) {
    const replierAlias = reply.user?.alias ?? "Alguien";
    const label = parent.chapter
      ? `Cap. ${parent.chapter.name}`
      : parent.series?.name ?? "";
    createNotification({
      userId: parent.userId,
      type: "COMMENT_REPLY",
      title: "Nueva respuesta",
      body: `${replierAlias} te respondió en ${label}`,
      data: {
        chapterId: canonicalChapterId,
        seriesId: canonicalSeriesId,
        commentId,
        replyId: reply.id,
        seriesSlug: parent.chapter?.series?.slug ?? parent.series?.slug ?? null,
        chapterName: parent.chapter?.name ?? null,
      },
    }).catch((err) => logger.warn({ err }, "Error creando notificación de reply"));
  }

  ActivityLogService.logEvent(userId, "CREATE_COMMENT", {
    chapterId: canonicalChapterId,
    seriesId: canonicalSeriesId,
    commentId: reply.id,
    parentId: commentId,
    content: reply.content.slice(0, 100),
    seriesName: parent.chapter?.series?.name ?? parent.series?.name ?? null,
    seriesSlug: parent.chapter?.series?.slug ?? parent.series?.slug ?? null,
    chapterName: parent.chapter?.name ?? null,
  }).catch((err) => logger.warn({ err }, "Error logging reply activity"));

  return formatComment(reply, userId);
}

export async function updateComment(userId, commentId, content, isSpoiler, userRole) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { userId: true, visible: true },
  });
  if (!comment || !comment.visible) throw new NotFoundError("Comentario no encontrado");
  if (comment.userId !== userId && userRole !== "ADMIN") {
    throw new ForbiddenError("No puedes editar este comentario");
  }

  const data = { content };
  if (isSpoiler !== undefined) data.isSpoiler = isSpoiler;

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data,
    include: {
      user: { select: COMMENT_USER_SELECT },
      _count: { select: { likes: true } },
      likes: { where: { userId }, select: { userId: true } },
    },
  });

  return formatComment(updated, userId);
}

export async function deleteComment(userId, commentId, userRole) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      userId: true,
      chapterId: true,
      content: true,
      chapter: { select: { name: true, series: { select: { slug: true, name: true } } } },
    },
  });
  if (!comment) throw new NotFoundError("Comentario no encontrado");
  if (comment.userId !== userId && userRole !== "ADMIN") {
    throw new ForbiddenError("No puedes eliminar este comentario");
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: { visible: false },
  });

  ActivityLogService.logEvent(userId, "DELETE_COMMENT", {
    chapterId: comment.chapterId,
    commentId,
    content: comment.content.slice(0, 100),
    seriesName: comment.chapter?.series?.name ?? null,
    seriesSlug: comment.chapter?.series?.slug ?? null,
    chapterName: comment.chapter?.name ?? null,
  }).catch((err) => logger.warn({ err }, "Error logging delete comment activity"));
}

export async function toggleLike(userId, commentId) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, visible: true },
  });
  if (!comment || !comment.visible) throw new NotFoundError("Comentario no encontrado");

  const existing = await prisma.commentLike.findUnique({
    where: { userId_commentId: { userId, commentId } },
  });

  if (existing) {
    await prisma.commentLike.delete({
      where: { userId_commentId: { userId, commentId } },
    });
    return { liked: false };
  }

  await prisma.commentLike.create({
    data: { userId, commentId },
  });
  return { liked: true };
}
