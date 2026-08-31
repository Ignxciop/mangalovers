import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../helpers/app.js";
import { prisma } from "../helpers/prisma.js";
import { createUser } from "../helpers/factories.js";
import { generateAccessToken } from "../helpers/auth.js";
import { createMessage } from "../../src/chat/chatService.js";
import { MutedError } from "../../src/utils/errors.js";

const app = buildApp();

async function createRawMessage(userId, content, overrides = {}) {
  return prisma.chatMessage.create({
    data: { userId, content, ...overrides },
  });
}

describe("GET /api/chat/messages", () => {
  it("rechaza sin autenticación con 401", async () => {
    const res = await request(app).get("/api/chat/messages").expect(401);
    expect(res.body.success).toBe(false);
  });

  it("devuelve lista vacía y nextCursor null sin mensajes", async () => {
    const user = await createUser();
    const token = generateAccessToken(user.id);

    const res = await request(app)
      .get("/api/chat/messages")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.messages).toEqual([]);
    expect(res.body.data.nextCursor).toBeNull();
  });

  it("devuelve los últimos N mensajes sin cursor en orden descendente", async () => {
    const user = await createUser();
    const token = generateAccessToken(user.id);
    for (let i = 1; i <= 5; i++) {
      await createRawMessage(user.id, `mensaje ${i}`);
    }

    const res = await request(app)
      .get("/api/chat/messages?limit=3")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.messages).toHaveLength(3);
    expect(res.body.data.messages[0].content).toBe("mensaje 5");
    expect(res.body.data.messages[2].content).toBe("mensaje 3");
  });

  it("pagina hacia atrás usando el cursor", async () => {
    const user = await createUser();
    const token = generateAccessToken(user.id);
    for (let i = 1; i <= 5; i++) {
      await createRawMessage(user.id, `mensaje ${i}`);
    }

    const first = await request(app)
      .get("/api/chat/messages?limit=2")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(first.body.data.messages).toHaveLength(2);
    expect(first.body.data.messages[0].content).toBe("mensaje 5");
    expect(first.body.data.nextCursor).toBe(first.body.data.messages[1].id);

    const second = await request(app)
      .get(`/api/chat/messages?limit=2&cursor=${first.body.data.nextCursor}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(second.body.data.messages).toHaveLength(2);
    expect(second.body.data.messages[0].content).toBe("mensaje 3");
    expect(second.body.data.messages[1].content).toBe("mensaje 2");
  });

  it("no devuelve mensajes con visible:false", async () => {
    const user = await createUser();
    const token = generateAccessToken(user.id);
    await createRawMessage(user.id, "visible");
    await createRawMessage(user.id, "oculto", { visible: false });

    const res = await request(app)
      .get("/api/chat/messages")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.messages).toHaveLength(1);
    expect(res.body.data.messages[0].content).toBe("visible");
  });

  it("devuelve nextCursor null cuando ya no hay más mensajes", async () => {
    const user = await createUser();
    const token = generateAccessToken(user.id);
    for (let i = 1; i <= 3; i++) {
      await createRawMessage(user.id, `mensaje ${i}`);
    }

    const res = await request(app)
      .get("/api/chat/messages?limit=10")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.messages).toHaveLength(3);
    expect(res.body.data.nextCursor).toBeNull();
  });

  it("valida query params inválidos con 400", async () => {
    const user = await createUser();
    const token = generateAccessToken(user.id);

    await request(app)
      .get("/api/chat/messages?limit=999")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);

    await request(app)
      .get("/api/chat/messages?cursor=abc")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });
});

describe("chatService.createMessage", () => {
  it("persiste el mensaje y devuelve el shape esperado con datos del usuario", async () => {
    const user = await createUser({ alias: "chatty" });

    const message = await createMessage(user.id, "hola comunidad");

    expect(message.id).toBeDefined();
    expect(message.content).toBe("hola comunidad");
    expect(message.isSpoiler).toBe(false);
    expect(message.createdAt).toBeInstanceOf(Date);
    expect(message.user).toEqual({
      id: user.id,
      alias: "chatty",
      avatarUrl: user.avatarUrl,
    });

    const persisted = await prisma.chatMessage.findUnique({
      where: { id: message.id },
    });
    expect(persisted).not.toBeNull();
    expect(persisted.userId).toBe(user.id);
    expect(persisted.content).toBe("hola comunidad");
    expect(persisted.visible).toBe(true);
  });

  it("lanza NotFound si el usuario no existe", async () => {
    await expect(createMessage("no-existe", "hola")).rejects.toThrow();
  });

  it("lanza MutedError si existe un mute activo en el futuro", async () => {
    const user = await createUser();
    const admin = await createUser();
    const mutedUntil = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.chatMute.create({
      data: { userId: user.id, mutedById: admin.id, mutedUntil },
    });

    await expect(createMessage(user.id, "hola")).rejects.toThrow(MutedError);
  });

  it("lanza MutedError para mute permanente (mutedUntil null)", async () => {
    const user = await createUser();
    const admin = await createUser();
    await prisma.chatMute.create({
      data: { userId: user.id, mutedById: admin.id, mutedUntil: null },
    });

    await expect(createMessage(user.id, "hola")).rejects.toThrow(MutedError);
  });

  it("no bloquea con un mute expirado (mutedUntil en el pasado)", async () => {
    const user = await createUser();
    const admin = await createUser();
    await prisma.chatMute.create({
      data: { userId: user.id, mutedById: admin.id, mutedUntil: new Date(Date.now() - 1000) },
    });

    const message = await createMessage(user.id, "puedo hablar");
    expect(message.content).toBe("puedo hablar");
  });

  it("lanza MutedError si el usuario está BANNED", async () => {
    const user = await createUser({ status: "BANNED" });

    await expect(createMessage(user.id, "hola")).rejects.toThrow(MutedError);
  });

  it("lanza MutedError si el usuario está SUSPENDED hasta el futuro", async () => {
    const user = await createUser({
      status: "SUSPENDED",
      suspendedUntil: new Date(Date.now() + 60 * 60 * 1000),
    });

    await expect(createMessage(user.id, "hola")).rejects.toThrow(MutedError);
  });
});

describe("GET /api/chat/me/mute", () => {
  it("rechaza sin autenticación con 401", async () => {
    const res = await request(app).get("/api/chat/me/mute").expect(401);
    expect(res.body.success).toBe(false);
  });

  it("devuelve null si el usuario no está silenciado", async () => {
    const user = await createUser();
    const token = generateAccessToken(user.id);

    const res = await request(app)
      .get("/api/chat/me/mute")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });

  it("devuelve el mute activo con mutedUntil futuro", async () => {
    const user = await createUser();
    const admin = await createUser();
    const mutedUntil = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.chatMute.create({
      data: { userId: user.id, mutedById: admin.id, mutedUntil, reason: "spam" },
    });

    const res = await request(app)
      .get("/api/chat/me/mute")
      .set("Authorization", `Bearer ${generateAccessToken(user.id)}`)
      .expect(200);

    expect(res.body.data.mutedUntil).toBe(mutedUntil.toISOString());
    expect(res.body.data.reason).toBe("spam");
  });

  it("devuelve null para un mute expirado", async () => {
    const user = await createUser();
    const admin = await createUser();
    await prisma.chatMute.create({
      data: {
        userId: user.id,
        mutedById: admin.id,
        mutedUntil: new Date(Date.now() - 1000),
      },
    });

    const res = await request(app)
      .get("/api/chat/me/mute")
      .set("Authorization", `Bearer ${generateAccessToken(user.id)}`)
      .expect(200);

    expect(res.body.data).toBeNull();
  });
});