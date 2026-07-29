import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    comment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    commentLike: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    chapter: { findUnique: vi.fn() },
    series: { findUnique: vi.fn() },
  },
}));

vi.mock("../../../src/notifications/notificationService.js", () => ({
  createNotification: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../../src/activityLog/activityLogService.js", () => ({
  ActivityLogService: { logEvent: vi.fn().mockResolvedValue({}) },
}));

vi.mock("../../../src/config/logger.js", () => ({
  default: { warn: vi.fn() },
  warn: vi.fn(),
}));

const { prisma } = await import("../../../src/config/prisma.js");
const { createNotification } = await import("../../../src/notifications/notificationService.js");
const { ActivityLogService } = await import("../../../src/activityLog/activityLogService.js");

const {
  getChapterComments,
  getSeriesComments,
  getCommentReplies,
  createComment,
  createSeriesComment,
  replyToComment,
  updateComment,
  deleteComment,
  toggleLike,
} = await import("../../../src/comments/commentService.js");

function makeComment(id, overrides = {}) {
  return {
    id,
    content: `comment ${id}`,
    isSpoiler: false,
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: `user-${id}`,
    chapterId: null,
    seriesId: null,
    user: { id: `user-${id}`, alias: `User${id}`, avatarUrl: null },
    _count: { likes: 0, replies: 0 },
    likes: [],
    replies: [],
    ...overrides,
  };
}

describe("commentService.getChapterComments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna top-level comments con hasta 5 replies anidadas", async () => {
    const topLevel = makeComment(1, {
      chapterId: 10,
      _count: { likes: 2, replies: 3 },
      replies: [
        makeComment(2, {
          parentId: 1,
          chapterId: 10,
          _count: { likes: 1, replies: 1 },
          replies: [
            makeComment(3, { parentId: 2, chapterId: 10, _count: { likes: 0 } }),
          ],
        }),
      ],
    });

    prisma.comment.findMany.mockResolvedValue([topLevel]);
    prisma.comment.count.mockResolvedValue(1);

    const result = await getChapterComments(10, "user-1");

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe(1);
    expect(result.data[0].replyCount).toBe(3);
    expect(result.data[0].replies).toHaveLength(1);
    expect(result.data[0].replies[0].id).toBe(2);
    expect(result.data[0].replies[0].replies).toHaveLength(1);
    expect(result.data[0].replies[0].replies[0].id).toBe(3);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it("retorna isLikedByMe true cuando el usuario dio like", async () => {
    const topLevel = makeComment(1, {
      chapterId: 10,
      _count: { likes: 1, replies: 0 },
      likes: [{ userId: "user-1" }],
    });

    prisma.comment.findMany.mockResolvedValue([topLevel]);
    prisma.comment.count.mockResolvedValue(1);

    const result = await getChapterComments(10, "user-1");
    expect(result.data[0].isLikedByMe).toBe(true);
  });

  it("retorna isLikedByMe false sin usuario autenticado", async () => {
    const topLevel = makeComment(1, {
      chapterId: 10,
      _count: { likes: 1, replies: 0 },
    });

    prisma.comment.findMany.mockResolvedValue([topLevel]);
    prisma.comment.count.mockResolvedValue(1);

    const result = await getChapterComments(10, null);
    expect(result.data[0].isLikedByMe).toBe(false);
  });

  it("retorna array vacio cuando no hay comentarios", async () => {
    prisma.comment.findMany.mockResolvedValue([]);
    prisma.comment.count.mockResolvedValue(0);

    const result = await getChapterComments(10, null);
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("usa limit=10 por defecto", async () => {
    prisma.comment.findMany.mockResolvedValue([]);
    prisma.comment.count.mockResolvedValue(0);

    await getChapterComments(10, null);

    expect(prisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
  });
});

describe("commentService.getSeriesComments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna comentarios de serie con replies", async () => {
    const topLevel = makeComment(1, {
      seriesId: 5,
      _count: { likes: 0, replies: 2 },
      replies: [
        makeComment(2, { parentId: 1, seriesId: 5, _count: { likes: 0, replies: 0 } }),
      ],
    });

    prisma.comment.findMany.mockResolvedValue([topLevel]);
    prisma.comment.count.mockResolvedValue(1);

    const result = await getSeriesComments(5, null);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].seriesId).toBeUndefined();
    expect(result.data[0].replies).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});

describe("commentService.getCommentReplies", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna replies paginadas con nested replies", async () => {
    const replies = [
      makeComment(2, { parentId: 1, _count: { likes: 0, replies: 1 } }),
    ];
    const nested = [
      makeComment(3, { parentId: 2, _count: { likes: 0 } }),
    ];

    prisma.comment.findMany
      .mockResolvedValueOnce(replies)
      .mockResolvedValueOnce(nested);
    prisma.comment.count.mockResolvedValue(1);

    const result = await getCommentReplies(1, null);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe(2);
    expect(result.data[0].replies).toHaveLength(1);
    expect(result.data[0].replies[0].id).toBe(3);
    expect(result.total).toBe(1);
    expect(result.offset).toBe(0);
    expect(result.limit).toBe(5);
  });

  it("retorna array vacio si no hay replies", async () => {
    prisma.comment.findMany.mockResolvedValue([]);
    prisma.comment.count.mockResolvedValue(0);

    const result = await getCommentReplies(1, null);

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe("commentService.createComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea un comentario en un capitulo", async () => {
    prisma.chapter.findUnique.mockResolvedValue({
      id: 10,
      name: "Cap 1",
      series: { slug: "my-series", name: "My Series" },
    });
    prisma.comment.create.mockResolvedValue(makeComment(1, {
      chapterId: 10,
      _count: { likes: 0 },
    }));

    const result = await createComment("user-1", 10, "Hola mundo");

    expect(result.content).toBe("comment 1");
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: { userId: "user-1", chapterId: 10, content: "Hola mundo", isSpoiler: false },
      include: expect.any(Object),
    });
    expect(ActivityLogService.logEvent).toHaveBeenCalled();
  });

  it("lanza NotFoundError si el capitulo no existe", async () => {
    prisma.chapter.findUnique.mockResolvedValue(null);

    await expect(createComment("user-1", 999, "test"))
      .rejects.toThrow("Capítulo no encontrado");
  });
});

describe("commentService.createSeriesComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea un comentario en una serie", async () => {
    prisma.series.findUnique.mockResolvedValue({ id: 5, name: "Mi Serie", slug: "mi-serie" });
    prisma.comment.create.mockResolvedValue(makeComment(1, {
      seriesId: 5,
      _count: { likes: 0 },
    }));

    const result = await createSeriesComment("user-1", 5, "Buen manga");

    expect(result.content).toBe("comment 1");
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: { userId: "user-1", seriesId: 5, content: "Buen manga", isSpoiler: false },
      include: expect.any(Object),
    });
    expect(ActivityLogService.logEvent).toHaveBeenCalled();
  });

  it("lanza NotFoundError si la serie no existe", async () => {
    prisma.series.findUnique.mockResolvedValue(null);

    await expect(createSeriesComment("user-1", 999, "test"))
      .rejects.toThrow("Serie no encontrada");
  });
});

describe("commentService.replyToComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea reply copiando chapterId del padre", async () => {
    prisma.comment.findUnique.mockResolvedValue({
      id: 1,
      userId: "parent-user",
      visible: true,
      chapterId: 10,
      seriesId: null,
      chapter: { name: "Cap 1", series: { slug: "s", name: "S" } },
      series: null,
      user: { alias: "Parent", name: "P", lastname: "U" },
    });
    prisma.comment.create.mockResolvedValue(makeComment(2, {
      parentId: 1,
      chapterId: 10,
      userId: "user-1",
      _count: { likes: 0 },
    }));

    const result = await replyToComment("user-1", 1, "Respuesta");

    expect(result.parentId).toBe(1);
    expect(prisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ chapterId: 10, seriesId: null, parentId: 1 }),
      }),
    );
  });

  it("crea reply copiando seriesId del padre si es comentario de serie", async () => {
    prisma.comment.findUnique.mockResolvedValue({
      id: 1,
      userId: "parent-user",
      visible: true,
      chapterId: null,
      seriesId: 5,
      chapter: null,
      series: { name: "Mi Serie", slug: "mi-serie" },
      user: { alias: "Parent", name: "P", lastname: "U" },
    });
    prisma.comment.create.mockResolvedValue(makeComment(2, {
      parentId: 1,
      seriesId: 5,
      userId: "user-1",
      _count: { likes: 0 },
    }));

    const result = await replyToComment("user-1", 1, "Respuesta");

    expect(prisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ chapterId: null, seriesId: 5, parentId: 1 }),
      }),
    );
  });

  it("notifica al dueño del padre si es otro usuario", async () => {
    prisma.comment.findUnique.mockResolvedValue({
      id: 1,
      userId: "parent-user",
      visible: true,
      chapterId: 10,
      seriesId: null,
      chapter: { name: "Cap 1", series: { slug: "s", name: "S" } },
      series: null,
      user: { alias: "Parent", name: "P", lastname: "U" },
    });
    prisma.comment.create.mockResolvedValue(makeComment(2, {
      parentId: 1,
      chapterId: 10,
      userId: "user-1",
      user: { id: "user-1", alias: "Replier", avatarUrl: null },
      _count: { likes: 0 },
    }));

    await replyToComment("user-1", 1, "Respuesta");

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "parent-user", type: "COMMENT_REPLY" }),
    );
  });

  it("NO notifica si responde a su propio comentario", async () => {
    prisma.comment.findUnique.mockResolvedValue({
      id: 1,
      userId: "user-1",
      visible: true,
      chapterId: 10,
      seriesId: null,
      chapter: { name: "Cap 1", series: { slug: "s", name: "S" } },
      series: null,
      user: { alias: "Self", name: "S", lastname: "U" },
    });
    prisma.comment.create.mockResolvedValue(makeComment(2, {
      parentId: 1,
      chapterId: 10,
      userId: "user-1",
      _count: { likes: 0 },
    }));

    await replyToComment("user-1", 1, "Respuesta");

    expect(createNotification).not.toHaveBeenCalled();
  });

  it("lanza NotFoundError si el padre no existe", async () => {
    prisma.comment.findUnique.mockResolvedValue(null);

    await expect(replyToComment("user-1", 999, "test"))
      .rejects.toThrow("Comentario no encontrado");
  });

  it("lanza NotFoundError si el padre está oculto", async () => {
    prisma.comment.findUnique.mockResolvedValue({ id: 1, userId: "parent-user", visible: false });

    await expect(replyToComment("user-1", 1, "test"))
      .rejects.toThrow("Comentario no encontrado");
  });
});

describe("commentService.updateComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("actualiza contenido del comentario", async () => {
    prisma.comment.findUnique.mockResolvedValue({ userId: "user-1", visible: true });
    prisma.comment.update.mockResolvedValue(makeComment(1, {
      content: "Editado",
      _count: { likes: 0 },
      updatedAt: new Date(Date.now() + 1000),
    }));

    const result = await updateComment("user-1", 1, "Editado", undefined, "USER");

    expect(prisma.comment.update).toHaveBeenCalled();
    expect(result.isEdited).toBe(true);
  });

  it("lanza ForbiddenError si no es el dueño ni admin", async () => {
    prisma.comment.findUnique.mockResolvedValue({ userId: "other-user", visible: true });

    await expect(updateComment("user-1", 1, "Editado", undefined, "USER"))
      .rejects.toThrow("No puedes editar este comentario");
  });

  it("admin puede editar cualquier comentario", async () => {
    prisma.comment.findUnique.mockResolvedValue({ userId: "other-user", visible: true });
    prisma.comment.update.mockResolvedValue(makeComment(1, {
      content: "Admin edit",
      _count: { likes: 0 },
      updatedAt: new Date(Date.now() + 1000),
    }));

    const result = await updateComment("admin-1", 1, "Admin edit", undefined, "ADMIN");

    expect(result.content).toBe("Admin edit");
    expect(result.isEdited).toBe(true);
  });

  it("lanza NotFoundError si el comentario no existe", async () => {
    prisma.comment.findUnique.mockResolvedValue(null);

    await expect(updateComment("user-1", 999, "test", undefined, "USER"))
      .rejects.toThrow("Comentario no encontrado");
  });

  it("lanza NotFoundError si el comentario está oculto", async () => {
    prisma.comment.findUnique.mockResolvedValue({ userId: "user-1", visible: false });

    await expect(updateComment("user-1", 1, "test", undefined, "USER"))
      .rejects.toThrow("Comentario no encontrado");
  });
});

describe("commentService.deleteComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("elimina el comentario siendo el dueño", async () => {
    prisma.comment.findUnique.mockResolvedValue({
      userId: "user-1",
      chapterId: 10,
      content: "test",
      chapter: { name: "Cap 1", series: { slug: "s", name: "S" } },
    });

    await deleteComment("user-1", 1, "USER");

    expect(prisma.comment.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { visible: false } });
    expect(ActivityLogService.logEvent).toHaveBeenCalled();
  });

  it("admin puede eliminar cualquier comentario", async () => {
    prisma.comment.findUnique.mockResolvedValue({
      userId: "other",
      chapterId: 10,
      content: "test",
      chapter: { name: "Cap 1", series: { slug: "s", name: "S" } },
    });

    await deleteComment("admin-1", 1, "ADMIN");

    expect(prisma.comment.update).toHaveBeenCalled();
  });

  it("lanza ForbiddenError si no es dueño ni admin", async () => {
    prisma.comment.findUnique.mockResolvedValue({
      userId: "other-user",
      chapterId: 10,
      content: "test",
      chapter: { name: "Cap 1", series: { slug: "s", name: "S" } },
    });

    await expect(deleteComment("user-1", 1, "USER"))
      .rejects.toThrow("No puedes eliminar este comentario");
  });

  it("lanza NotFoundError si el comentario no existe", async () => {
    prisma.comment.findUnique.mockResolvedValue(null);

    await expect(deleteComment("user-1", 999, "USER"))
      .rejects.toThrow("Comentario no encontrado");
  });
});

describe("commentService.toggleLike", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea like si no existe", async () => {
    prisma.comment.findUnique.mockResolvedValue({ id: 1, visible: true });
    prisma.commentLike.findUnique.mockResolvedValue(null);

    const result = await toggleLike("user-1", 1);

    expect(result.liked).toBe(true);
    expect(prisma.commentLike.create).toHaveBeenCalledWith({
      data: { userId: "user-1", commentId: 1 },
    });
  });

  it("elimina like si ya existe", async () => {
    prisma.comment.findUnique.mockResolvedValue({ id: 1, visible: true });
    prisma.commentLike.findUnique.mockResolvedValue({ userId: "user-1", commentId: 1 });

    const result = await toggleLike("user-1", 1);

    expect(result.liked).toBe(false);
    expect(prisma.commentLike.delete).toHaveBeenCalledWith({
      where: { userId_commentId: { userId: "user-1", commentId: 1 } },
    });
  });

  it("lanza NotFoundError si el comentario no existe", async () => {
    prisma.comment.findUnique.mockResolvedValue(null);

    await expect(toggleLike("user-1", 999))
      .rejects.toThrow("Comentario no encontrado");
  });
});
