import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../helpers/app.js";
import { prisma } from "../helpers/prisma.js";
import { createUser } from "../helpers/factories.js";
import { generateAccessToken } from "../helpers/auth.js";
import { createMessage } from "../../src/chat/chatService.js";

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
});