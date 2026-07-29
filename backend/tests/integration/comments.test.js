import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../helpers/app.js";
import { prisma } from "../helpers/prisma.js";
import { createUser, createSeries, createChapter } from "../helpers/factories.js";
import { generateAccessToken } from "../helpers/auth.js";

const app = buildApp();

async function createCommentTree(seriesId, chapterId) {
  const user1 = await createUser({ alias: "User1" });
  const user2 = await createUser({ alias: "User2" });

  const topComment = await prisma.comment.create({
    data: { userId: user1.id, chapterId, seriesId, content: "Top comment", isSpoiler: false },
  });

  const reply1 = await prisma.comment.create({
    data: { userId: user2.id, chapterId, seriesId, parentId: topComment.id, content: "Reply 1", isSpoiler: false },
  });

  const reply2 = await prisma.comment.create({
    data: { userId: user1.id, chapterId, seriesId, parentId: topComment.id, content: "Reply 2", isSpoiler: false },
  });

  const nestedReply = await prisma.comment.create({
    data: { userId: user2.id, chapterId, seriesId, parentId: reply1.id, content: "Nested reply", isSpoiler: false },
  });

  return { topComment, reply1, reply2, nestedReply, user1, user2 };
}

describe("GET /api/comments/chapter/:chapterId", () => {
  it("retorna comentarios paginados con replies", async () => {
    const series = await createSeries();
    const chapter = await createChapter(series.id);
    const { user1 } = await createCommentTree(series.id, chapter.id);
    const token = generateAccessToken(user1);

    const res = await request(app)
      .get(`/api/comments/chapter/${chapter.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].content).toBe("Top comment");
    expect(res.body.data[0].replyCount).toBe(2);
    expect(res.body.data[0].replies).toHaveLength(2);
    expect(res.body.data[0].replies[0].replies).toEqual([]);
    expect(res.body.total).toBe(1);
    expect(res.body.limit).toBe(10);
  });

  it("funciona sin autenticación (optionalAuthenticate)", async () => {
    const series = await createSeries();
    const chapter = await createChapter(series.id);
    await createCommentTree(series.id, chapter.id);

    const res = await request(app)
      .get(`/api/comments/chapter/${chapter.id}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data[0].isLikedByMe).toBe(false);
  });

  it("retorna array vacío si no hay comentarios", async () => {
    const series = await createSeries();
    const chapter = await createChapter(series.id);

    const res = await request(app)
      .get(`/api/comments/chapter/${chapter.id}`)
      .expect(200);

    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it("valida chapterId inválido", async () => {
    const res = await request(app)
      .get("/api/comments/chapter/abc")
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/comments/series/:seriesId", () => {
  it("retorna comentarios de serie", async () => {
    const series = await createSeries();
    const { user1 } = await createCommentTree(series.id, null);
    const token = generateAccessToken(user1);

    const res = await request(app)
      .get(`/api/comments/series/${series.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].replyCount).toBe(2);
  });
});

describe("GET /api/comments/:id/replies", () => {
  it("retorna replies paginadas para un comentario", async () => {
    const series = await createSeries();
    const chapter = await createChapter(series.id);
    const { topComment, user1 } = await createCommentTree(series.id, chapter.id);
    const token = generateAccessToken(user1);

    const res = await request(app)
      .get(`/api/comments/${topComment.id}/replies?offset=0&limit=5`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(res.body.offset).toBe(0);
    expect(res.body.data[0].replies).toHaveLength(1);
  });
});

describe("POST /api/comments/chapter/:chapterId", () => {
  it("crea un comentario autenticado", async () => {
    const user = await createUser();
    const series = await createSeries();
    const chapter = await createChapter(series.id);
    const token = generateAccessToken(user);

    const res = await request(app)
      .post(`/api/comments/chapter/${chapter.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Nuevo comentario" })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.content).toBe("Nuevo comentario");
    expect(res.body.data.replyCount).toBe(0);
  });

  it("rechaza sin autenticación", async () => {
    const series = await createSeries();
    const chapter = await createChapter(series.id);

    await request(app)
      .post(`/api/comments/chapter/${chapter.id}`)
      .send({ content: "test" })
      .expect(401);
  });

  it("rechaza contenido vacío", async () => {
    const user = await createUser();
    const series = await createSeries();
    const chapter = await createChapter(series.id);
    const token = generateAccessToken(user);

    const res = await request(app)
      .post(`/api/comments/chapter/${chapter.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "" })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

describe("POST /api/comments/series/:seriesId", () => {
  it("crea un comentario de serie", async () => {
    const user = await createUser();
    const series = await createSeries();
    const token = generateAccessToken(user);

    const res = await request(app)
      .post(`/api/comments/series/${series.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Comentario de serie" })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.content).toBe("Comentario de serie");
  });
});

describe("POST /api/comments/:id/reply", () => {
  it("crea reply heredando el contexto del padre", async () => {
    const series = await createSeries();
    const chapter = await createChapter(series.id);
    const user1 = await createUser({ alias: "Author" });
    const user2 = await createUser({ alias: "Replier" });
    const parentToken = generateAccessToken(user1);
    const replyToken = generateAccessToken(user2);

    const parentRes = await request(app)
      .post(`/api/comments/chapter/${chapter.id}`)
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ content: "Parent" })
      .expect(201);

    const res = await request(app)
      .post(`/api/comments/${parentRes.body.data.id}/reply`)
      .set("Authorization", `Bearer ${replyToken}`)
      .send({ content: "Reply" })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.parentId).toBe(parentRes.body.data.id);
  });

  it("rechaza sin autenticación", async () => {
    await request(app)
      .post("/api/comments/1/reply")
      .send({ content: "test" })
      .expect(401);
  });
});

describe("PATCH /api/comments/:id", () => {
  it("dueño puede actualizar su comentario", async () => {
    const user = await createUser();
    const series = await createSeries();
    const chapter = await createChapter(series.id);
    const token = generateAccessToken(user);

    const createRes = await request(app)
      .post(`/api/comments/chapter/${chapter.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Original" })
      .expect(201);

    const res = await request(app)
      .patch(`/api/comments/${createRes.body.data.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Editado" })
      .expect(200);

    expect(res.body.data.content).toBe("Editado");
  });

  it("otro usuario no puede editar", async () => {
    const user1 = await createUser({ alias: "Owner" });
    const user2 = await createUser({ alias: "Intruder" });
    const series = await createSeries();
    const chapter = await createChapter(series.id);
    const ownerToken = generateAccessToken(user1);
    const intruderToken = generateAccessToken(user2);

    const createRes = await request(app)
      .post(`/api/comments/chapter/${chapter.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ content: "Original" })
      .expect(201);

    await request(app)
      .patch(`/api/comments/${createRes.body.data.id}`)
      .set("Authorization", `Bearer ${intruderToken}`)
      .send({ content: "Hackeado" })
      .expect(403);
  });
});

describe("DELETE /api/comments/:id", () => {
  it("dueño puede eliminar su comentario", async () => {
    const user = await createUser();
    const series = await createSeries();
    const chapter = await createChapter(series.id);
    const token = generateAccessToken(user);

    const createRes = await request(app)
      .post(`/api/comments/chapter/${chapter.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "A eliminar" })
      .expect(201);

    await request(app)
      .delete(`/api/comments/${createRes.body.data.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
  });

  it("admin puede eliminar cualquier comentario", async () => {
    const user = await createUser({ alias: "Normal" });
    const admin = await createUser({ alias: "Admin", role: "ADMIN" });
    const series = await createSeries();
    const chapter = await createChapter(series.id);
    const userToken = generateAccessToken(user);
    const adminToken = generateAccessToken(admin);

    const createRes = await request(app)
      .post(`/api/comments/chapter/${chapter.id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ content: "Admin borrará esto" })
      .expect(201);

    await request(app)
      .delete(`/api/comments/${createRes.body.data.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
  });

  it("otro usuario no puede eliminar", async () => {
    const user1 = await createUser({ alias: "Owner" });
    const user2 = await createUser({ alias: "Intruder" });
    const series = await createSeries();
    const chapter = await createChapter(series.id);
    const ownerToken = generateAccessToken(user1);
    const intruderToken = generateAccessToken(user2);

    const createRes = await request(app)
      .post(`/api/comments/chapter/${chapter.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ content: "Protegido" })
      .expect(201);

    await request(app)
      .delete(`/api/comments/${createRes.body.data.id}`)
      .set("Authorization", `Bearer ${intruderToken}`)
      .expect(403);
  });
});

describe("POST /api/comments/:id/like", () => {
  it("toggle like/unlike", async () => {
    const user = await createUser();
    const series = await createSeries();
    const chapter = await createChapter(series.id);
    const token = generateAccessToken(user);

    const createRes = await request(app)
      .post(`/api/comments/chapter/${chapter.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Likeme" })
      .expect(201);

    const likeRes = await request(app)
      .post(`/api/comments/${createRes.body.data.id}/like`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(likeRes.body.liked).toBe(true);

    const unlikeRes = await request(app)
      .post(`/api/comments/${createRes.body.data.id}/like`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(unlikeRes.body.liked).toBe(false);
  });

  it("rechaza sin autenticación", async () => {
    await request(app)
      .post("/api/comments/1/like")
      .expect(401);
  });
});
