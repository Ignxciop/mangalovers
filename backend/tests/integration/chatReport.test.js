import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../helpers/app.js";
import { prisma } from "../helpers/prisma.js";
import { createUser } from "../helpers/factories.js";
import { generateAccessToken } from "../helpers/auth.js";
import { waitForCondition } from "../helpers/socket.js";

const app = buildApp();

async function createMessage(userId, content, overrides = {}) {
  return prisma.chatMessage.create({
    data: { userId, content, ...overrides },
  });
}

describe("POST /api/chat/messages/:id/report", () => {
  it("rechaza sin autenticación con 401", async () => {
    await request(app)
      .post("/api/chat/messages/1/report")
      .send({ reason: "OFFENSIVE_LANGUAGE" })
      .expect(401);
  });

  it("valida el motivo con 400", async () => {
    const user = await createUser();
    const token = generateAccessToken(user.id);
    const message = await createMessage(user.id, "hola");

    await request(app)
      .post(`/api/chat/messages/${message.id}/report`)
      .set("Authorization", `Bearer ${token}`)
      .send({ reason: "SPAM" })
      .expect(400);

    await request(app)
      .post("/api/chat/messages/abc/report")
      .set("Authorization", `Bearer ${token}`)
      .send({ reason: "OTHER" })
      .expect(400);
  });

  it("devuelve 404 si el mensaje no existe o no está visible", async () => {
    const user = await createUser();
    const token = generateAccessToken(user.id);
    const hidden = await createMessage(user.id, "oculto", { visible: false });

    await request(app)
      .post("/api/chat/messages/999999/report")
      .set("Authorization", `Bearer ${token}`)
      .send({ reason: "OTHER" })
      .expect(404);

    await request(app)
      .post(`/api/chat/messages/${hidden.id}/report`)
      .set("Authorization", `Bearer ${token}`)
      .send({ reason: "OTHER" })
      .expect(404);
  });

  it("impide reportar un mensaje propio con 403", async () => {
    const author = await createUser({ alias: "autor" });
    const token = generateAccessToken(author.id);
    const message = await createMessage(author.id, "mi propio mensaje");

    await request(app)
      .post(`/api/chat/messages/${message.id}/report`)
      .set("Authorization", `Bearer ${token}`)
      .send({ reason: "OFFENSIVE_LANGUAGE" })
      .expect(403);
  });

  it("impide reportar dos veces el mismo mensaje con 403", async () => {
    const author = await createUser({ alias: "autor" });
    const reporter = await createUser({ alias: "reporter" });
    const message = await createMessage(author.id, "mensaje ofensivo");

    const first = await request(app)
      .post(`/api/chat/messages/${message.id}/report`)
      .set("Authorization", `Bearer ${generateAccessToken(reporter.id)}`)
      .send({ reason: "OFFENSIVE_LANGUAGE", description: "texto agresivo" })
      .expect(201);

    expect(first.body.data.status).toBe("PENDING");
    expect(first.body.data.reason).toBe("OFFENSIVE_LANGUAGE");
    expect(first.body.data.reporter.id).toBe(reporter.id);
    expect(first.body.data.message.id).toBe(message.id);

    await request(app)
      .post(`/api/chat/messages/${message.id}/report`)
      .set("Authorization", `Bearer ${generateAccessToken(reporter.id)}`)
      .send({ reason: "OTHER" })
      .expect(403);
  });

  it("crea el reporte, registra actividad y notifica a cada admin", async () => {
    const author = await createUser({ alias: "autor" });
    const reporter = await createUser({ alias: "reporter" });
    const admin1 = await createUser({ role: "ADMIN" });
    const admin2 = await createUser({ role: "ADMIN" });
    const message = await createMessage(author.id, "contenido reportado");

    const res = await request(app)
      .post(`/api/chat/messages/${message.id}/report`)
      .set("Authorization", `Bearer ${generateAccessToken(reporter)}`)
      .send({ reason: "UNMARKED_SPOILER", description: "spoiler de one piece" })
      .expect(201);

    expect(res.body.data.message.content).toContain("contenido reportado");
    expect(res.body.data.description).toBe("spoiler de one piece");

    const log = await prisma.userActivity.findFirst({
      where: { userId: reporter.id, event: "REPORT_CHAT_MESSAGE" },
      orderBy: { createdAt: "desc" },
    });
    expect(log).not.toBeNull();
    expect(log.metadata.messageId).toBe(message.id);
    expect(log.metadata.reason).toBe("UNMARKED_SPOILER");
    expect(log.metadata.reportedUserId).toBe(author.id);

    const notifications = await waitForCondition(async () => {
      const rows = await prisma.notification.findMany({
        where: { type: "NEW_REPORT", userId: { in: [admin1.id, admin2.id] } },
      });
      return rows.length === 2 ? rows : null;
    });
    expect(notifications.every((n) => n.title && n.body)).toBe(true);
  });
});

describe("Rutas admin de reportes de chat (/api/admin/chat)", () => {
  it("requiere autenticación y rol ADMIN", async () => {
    await request(app).get("/api/admin/chat/reports").expect(401);

    const user = await createUser();
    await request(app)
      .get("/api/admin/chat/reports")
      .set("Authorization", `Bearer ${generateAccessToken(user)}`)
      .expect(401);

    const admin = await createUser({ role: "ADMIN" });
    await request(app)
      .get("/api/admin/chat/reports")
      .set("Authorization", `Bearer ${generateAccessToken(admin)}`)
      .expect(200);
  });

  it("listar reportes soporta filtro por estado y paginación", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const token = generateAccessToken(admin);
    const author = await createUser();
    const reporter = await createUser();
    const message = await createMessage(author.id, "mensaje");

    await request(app)
      .post(`/api/chat/messages/${message.id}/report`)
      .set("Authorization", `Bearer ${generateAccessToken(reporter)}`)
      .send({ reason: "OFFENSIVE_LANGUAGE" });

    const res = await request(app)
      .get("/api/admin/chat/reports?status=PENDING&limit=10")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe("PENDING");
    expect(res.body.meta.total).toBe(1);
  });

  it("pending-count devuelve la cantidad de reportes pendientes", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const token = generateAccessToken(admin);
    const author = await createUser();
    const reporter = await createUser();

    const m1 = await createMessage(author.id, "primero");
    const m2 = await createMessage(author.id, "segundo");
    await request(app)
      .post(`/api/chat/messages/${m1.id}/report`)
      .set("Authorization", `Bearer ${generateAccessToken(reporter)}`)
      .send({ reason: "OTHER" });
    await request(app)
      .post(`/api/chat/messages/${m2.id}/report`)
      .set("Authorization", `Bearer ${generateAccessToken(reporter)}`)
      .send({ reason: "OTHER" });

    const res = await request(app)
      .get("/api/admin/chat/reports/pending-count")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.count).toBe(2);
  });

  it("resolver valida estado, id y prohibe re-procesar", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const token = generateAccessToken(admin);
    const author = await createUser();
    const reporter = await createUser();
    const message = await createMessage(author.id, "mensaje");

    const { body } = await request(app)
      .post(`/api/chat/messages/${message.id}/report`)
      .set("Authorization", `Bearer ${generateAccessToken(reporter)}`)
      .send({ reason: "OTHER" });

    await request(app)
      .patch(`/api/admin/chat/reports/${body.data.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "INVALID" })
      .expect(400);

    await request(app)
      .patch("/api/admin/chat/reports/999999")
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "RESOLVED" })
      .expect(404);

    const resolved = await request(app)
      .patch(`/api/admin/chat/reports/${body.data.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "RESOLVED", adminNote: "emitido aviso" })
      .expect(200);

    expect(resolved.body.data.status).toBe("RESOLVED");
    expect(resolved.body.data.adminNote).toBe("emitido aviso");
    expect(resolved.body.data.resolvedBy.id).toBe(admin.id);

    await request(app)
      .patch(`/api/admin/chat/reports/${body.data.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "DISMISSED" })
      .expect(403);
  });

  it("validar resolución: nota admin con más de 500 caracteres da 400", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const token = generateAccessToken(admin);
    const author = await createUser();
    const reporter = await createUser();
    const message = await createMessage(author.id, "mensaje");

    const { body } = await request(app)
      .post(`/api/chat/messages/${message.id}/report`)
      .set("Authorization", `Bearer ${generateAccessToken(reporter)}`)
      .send({ reason: "OTHER" });

    await request(app)
      .patch(`/api/admin/chat/reports/${body.data.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "RESOLVED", adminNote: "x".repeat(501) })
      .expect(400);
  });
});