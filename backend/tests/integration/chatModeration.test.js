import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createUser } from "../helpers/factories.js";
import { generateAccessToken } from "../helpers/auth.js";
import { prisma } from "../helpers/prisma.js";
import { createMessage } from "../../src/chat/chatService.js";
import {
  createSocketTestServer,
  connectSocketClient,
  waitForSocketEvent,
  waitForCondition,
} from "../helpers/socket.js";

let serverCtx;
let clients = [];

async function connectUser(userId, overrides) {
  const token = generateAccessToken(
    overrides ? { id: userId, ...overrides } : userId,
  );
  const client = await connectSocketClient(serverCtx.url, token);
  clients.push(client);
  await waitForSocketEvent(client, "connect");
  return client;
}

function disconnectAll() {
  clients.forEach((c) => c.disconnect());
  clients = [];
}

function sendAndGetAck(client, content) {
  let ackResult;
  client.emit("chat:send", { content, isSpoiler: false }, (ack) => {
    ackResult = ack;
  });
  return waitForCondition(() => ackResult);
}

beforeAll(async () => {
  serverCtx = await createSocketTestServer();
});

afterAll(async () => {
  disconnectAll();
  await serverCtx.close();
});

describe("DELETE /api/admin/chat/messages/:id", () => {
  it("requiere autenticación y rol ADMIN y devuelve 404 si no existe", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const user = await createUser();

    await request(serverCtx.server).delete("/api/admin/chat/messages/1").expect(401);
    await request(serverCtx.server)
      .delete("/api/admin/chat/messages/1")
      .set("Authorization", `Bearer ${generateAccessToken(user)}`)
      .expect(401);

    await request(serverCtx.server)
      .delete("/api/admin/chat/messages/999999")
      .set("Authorization", `Bearer ${generateAccessToken(admin)}`)
      .expect(404);
  });

  it("elimina el mensaje (soft), lo oculta del historial y emite chat:message_deleted", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const author = await createUser();
    const spectator = await createUser();
    const authorClient = await connectUser(author.id);
    const spectatorClient = await connectUser(spectator.id);

    const message = await createMessage(author.id, "mensaje a eliminar");
    const messageId = message.id;

    const deletedEvent = waitForSocketEvent(spectatorClient, "chat:message_deleted");

    const res = await request(serverCtx.server)
      .delete(`/api/admin/chat/messages/${messageId}`)
      .set("Authorization", `Bearer ${generateAccessToken(admin)}`)
      .expect(200);
    expect(res.body.data.id).toBe(messageId);

    const event = await deletedEvent;
    expect(event.id).toBe(messageId);

    const persisted = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    expect(persisted.visible).toBe(false);

    const history = await request(serverCtx.server)
      .get("/api/chat/messages")
      .set("Authorization", `Bearer ${generateAccessToken(author)}`);
    expect(history.body.data.messages.some((m) => m.id === messageId)).toBe(false);

    const log = await prisma.userActivity.findFirst({
      where: { userId: admin.id, event: "DELETE_CHAT_MESSAGE" },
      orderBy: { createdAt: "desc" },
    });
    expect(log).not.toBeNull();
    expect(log.metadata.messageId).toBe(messageId);
    expect(log.metadata.targetUserId).toBe(author.id);

    disconnectAll();
  });

  it("impide eliminar un mensaje ya eliminado (403)", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const author = await createUser();
    const msg = await prisma.chatMessage.create({
      data: { userId: author.id, content: "ya oculto", visible: false },
    });

    await request(serverCtx.server)
      .delete(`/api/admin/chat/messages/${msg.id}`)
      .set("Authorization", `Bearer ${generateAccessToken(admin)}`)
      .expect(403);
  });
});

describe("POST /api/admin/chat/mutes", () => {
  it("requiere autenticación y rol ADMIN", async () => {
    const user = await createUser();
    const admin = await createUser({ role: "ADMIN" });

    await request(serverCtx.server).post("/api/admin/chat/mutes").send({ userId: "x" }).expect(401);

    await request(serverCtx.server)
      .post("/api/admin/chat/mutes")
      .set("Authorization", `Bearer ${generateAccessToken(user)}`)
      .send({ userId: "x" })
      .expect(401);

    await request(serverCtx.server)
      .post("/api/admin/chat/mutes")
      .set("Authorization", `Bearer ${generateAccessToken(admin)}`)
      .send({ userId: "no-existe" })
      .expect(404);
  });

  it("silencia temporalmente, emite chat:user_muted y el usuario no puede enviar", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const victim = await createUser({ alias: "vitimado" });
    const victimClient = await connectUser(victim.id);

    const mutedEvent = waitForSocketEvent(victimClient, "chat:user_muted");

    const res = await request(serverCtx.server)
      .post("/api/admin/chat/mutes")
      .set("Authorization", `Bearer ${generateAccessToken(admin)}`)
      .send({ userId: victim.id, durationMinutes: 30, reason: "flood" })
      .expect(201);

    expect(res.body.data.mutedUntil).not.toBeNull();
    expect(new Date(res.body.data.mutedUntil).getTime()).toBeGreaterThan(Date.now());

    const event = await mutedEvent;
    expect(event.userId).toBe(victim.id);
    expect(event.mutedUntil).toBe(res.body.data.mutedUntil);
    expect(event.reason).toBe("flood");

    const ack = await sendAndGetAck(victimClient, "intento mientras mute");
    expect(ack.ok).toBe(false);
    expect(ack.error).toBe("MUTED");

    const mute = await prisma.chatMute.findUnique({ where: { userId: victim.id } });
    expect(mute).not.toBeNull();
    expect(mute.mutedById).toBe(admin.id);

    const log = await prisma.userActivity.findFirst({
      where: { userId: admin.id, event: "MUTE_CHAT_USER" },
      orderBy: { createdAt: "desc" },
    });
    expect(log).not.toBeNull();
    expect(log.metadata.targetUserId).toBe(victim.id);
    expect(log.metadata.permanent).toBe(false);

    disconnectAll();
  });

  it("silencia permanentemente sin durationMinutes", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const victim = await createUser();
    const victimClient = await connectUser(victim.id);

    const mutedEvent = waitForSocketEvent(victimClient, "chat:user_muted");

    const res = await request(serverCtx.server)
      .post("/api/admin/chat/mutes")
      .set("Authorization", `Bearer ${generateAccessToken(admin)}`)
      .send({ userId: victim.id })
      .expect(201);

    expect(res.body.data.mutedUntil).toBeNull();

    const event = await mutedEvent;
    expect(event.userId).toBe(victim.id);
    expect(event.mutedUntil).toBeNull();

    const ack = await sendAndGetAck(victimClient, "otro intento");
    expect(ack.ok).toBe(false);
    expect(ack.error).toBe("MUTED");

    const log = await prisma.userActivity.findFirst({
      where: { userId: admin.id, event: "MUTE_CHAT_USER" },
      orderBy: { createdAt: "desc" },
    });
    expect(log.metadata.permanent).toBe(true);

    disconnectAll();
  });

  it("valida duración inválida con 400", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const victim = await createUser();

    await request(serverCtx.server)
      .post("/api/admin/chat/mutes")
      .set("Authorization", `Bearer ${generateAccessToken(admin)}`)
      .send({ userId: victim.id, durationMinutes: 0 })
      .expect(400);

    await request(serverCtx.server)
      .post("/api/admin/chat/mutes")
      .set("Authorization", `Bearer ${generateAccessToken(admin)}`)
      .send({ userId: victim.id, durationMinutes: "abc" })
      .expect(400);
  });
});

describe("DELETE /api/admin/chat/mutes/:userId", () => {
  it("requiere autenticación y rol ADMIN y devuelve 404 si no está silenciado", async () => {
    const user = await createUser();
    const admin = await createUser({ role: "ADMIN" });

    await request(serverCtx.server).delete("/api/admin/chat/mutes/user-1").expect(401);
    await request(serverCtx.server)
      .delete("/api/admin/chat/mutes/user-1")
      .set("Authorization", `Bearer ${generateAccessToken(user)}`)
      .expect(401);

    const victim = await createUser();
    await request(serverCtx.server)
      .delete(`/api/admin/chat/mutes/${victim.id}`)
      .set("Authorization", `Bearer ${generateAccessToken(admin)}`)
      .expect(404);
  });

  it("desilencia, emite chat:user_unmuted y el usuario vuelve a enviar", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const victim = await createUser({ alias: "liberado" });
    const victimClient = await connectUser(victim.id);

    await request(serverCtx.server)
      .post("/api/admin/chat/mutes")
      .set("Authorization", `Bearer ${generateAccessToken(admin)}`)
      .send({ userId: victim.id, durationMinutes: 60 });

    const unmutedEvent = waitForSocketEvent(victimClient, "chat:user_unmuted");

    await request(serverCtx.server)
      .delete(`/api/admin/chat/mutes/${victim.id}`)
      .set("Authorization", `Bearer ${generateAccessToken(admin)}`)
      .expect(200);

    const event = await unmutedEvent;
    expect(event.userId).toBe(victim.id);

    const mute = await prisma.chatMute.findUnique({ where: { userId: victim.id } });
    expect(mute).toBeNull();

    const ack = await sendAndGetAck(victimClient, "ya puedo hablar");
    expect(ack.ok).toBe(true);

    const log = await prisma.userActivity.findFirst({
      where: { userId: admin.id, event: "UNMUTE_CHAT_USER" },
      orderBy: { createdAt: "desc" },
    });
    expect(log).not.toBeNull();
    expect(log.metadata.targetUserId).toBe(victim.id);

    disconnectAll();
  });
});

describe("broadcast de eventos de moderación a todos los clientes de chat:global", () => {
  it("eliminar un mensaje emite chat:message_deleted a todos los clientes conectados", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const author = await createUser();
    const spectator = await createUser();
    const authorClient = await connectUser(author.id);
    const spectatorClient = await connectUser(spectator.id);

    const message = await createMessage(author.id, "mensaje a borrar en broadcast");

    const authorEvent = waitForSocketEvent(authorClient, "chat:message_deleted");
    const spectatorEvent = waitForSocketEvent(spectatorClient, "chat:message_deleted");

    await request(serverCtx.server)
      .delete(`/api/admin/chat/messages/${message.id}`)
      .set("Authorization", `Bearer ${generateAccessToken(admin)}`)
      .expect(200);

    const [fromAuthor, fromSpectator] = await Promise.all([authorEvent, spectatorEvent]);
    expect(fromAuthor.id).toBe(message.id);
    expect(fromSpectator.id).toBe(message.id);

    disconnectAll();
  });

  it("silenciar temporalmente emite chat:user_muted a todos los clientes conectados", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const victim = await createUser();
    const spectator = await createUser();
    const victimClient = await connectUser(victim.id);
    const spectatorClient = await connectUser(spectator.id);

    const victimEvent = waitForSocketEvent(victimClient, "chat:user_muted");
    const spectatorEvent = waitForSocketEvent(spectatorClient, "chat:user_muted");

    const res = await request(serverCtx.server)
      .post("/api/admin/chat/mutes")
      .set("Authorization", `Bearer ${generateAccessToken(admin)}`)
      .send({ userId: victim.id, durationMinutes: 45, reason: "broadcast temporal" })
      .expect(201);

    const [victimPayload, spectatorPayload] = await Promise.all([victimEvent, spectatorEvent]);
    expect(victimPayload.userId).toBe(victim.id);
    expect(victimPayload.mutedUntil).toBe(res.body.data.mutedUntil);
    expect(spectatorPayload.userId).toBe(victim.id);
    expect(spectatorPayload.mutedUntil).toBe(res.body.data.mutedUntil);
    expect(spectatorPayload.reason).toBe("broadcast temporal");

    disconnectAll();
  });

  it("silenciar permanentemente emite chat:user_muted (mutedUntil null) a todos los clientes", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const victim = await createUser();
    const spectator = await createUser();
    const victimClient = await connectUser(victim.id);
    const spectatorClient = await connectUser(spectator.id);

    const victimEvent = waitForSocketEvent(victimClient, "chat:user_muted");
    const spectatorEvent = waitForSocketEvent(spectatorClient, "chat:user_muted");

    await request(serverCtx.server)
      .post("/api/admin/chat/mutes")
      .set("Authorization", `Bearer ${generateAccessToken(admin)}`)
      .send({ userId: victim.id })
      .expect(201);

    const [victimPayload, spectatorPayload] = await Promise.all([victimEvent, spectatorEvent]);
    expect(victimPayload.userId).toBe(victim.id);
    expect(victimPayload.mutedUntil).toBeNull();
    expect(spectatorPayload.userId).toBe(victim.id);
    expect(spectatorPayload.mutedUntil).toBeNull();

    disconnectAll();
  });

  it("desilenciar emite chat:user_unmuted a todos los clientes conectados", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const victim = await createUser();
    const spectator = await createUser();
    const victimClient = await connectUser(victim.id);
    const spectatorClient = await connectUser(spectator.id);

    await request(serverCtx.server)
      .post("/api/admin/chat/mutes")
      .set("Authorization", `Bearer ${generateAccessToken(admin)}`)
      .send({ userId: victim.id, durationMinutes: 60 });

    const victimEvent = waitForSocketEvent(victimClient, "chat:user_unmuted");
    const spectatorEvent = waitForSocketEvent(spectatorClient, "chat:user_unmuted");

    await request(serverCtx.server)
      .delete(`/api/admin/chat/mutes/${victim.id}`)
      .set("Authorization", `Bearer ${generateAccessToken(admin)}`)
      .expect(200);

    const [victimPayload, spectatorPayload] = await Promise.all([victimEvent, spectatorEvent]);
    expect(victimPayload.userId).toBe(victim.id);
    expect(spectatorPayload.userId).toBe(victim.id);

    disconnectAll();
  });
});

describe("múltiples sockets del mismo usuario", () => {
  it("ambos clientes del mismo usuario reciben chat:user_muted al ser silenciado", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const victim = await createUser();
    const tabA = await connectUser(victim.id);
    const tabB = await connectUser(victim.id);

    const eventA = waitForSocketEvent(tabA, "chat:user_muted");
    const eventB = waitForSocketEvent(tabB, "chat:user_muted");

    const res = await request(serverCtx.server)
      .post("/api/admin/chat/mutes")
      .set("Authorization", `Bearer ${generateAccessToken(admin)}`)
      .send({ userId: victim.id, durationMinutes: 30 })
      .expect(201);

    const [payloadA, payloadB] = await Promise.all([eventA, eventB]);
    expect(payloadA.userId).toBe(victim.id);
    expect(payloadA.mutedUntil).toBe(res.body.data.mutedUntil);
    expect(payloadB.userId).toBe(victim.id);
    expect(payloadB.mutedUntil).toBe(res.body.data.mutedUntil);

    disconnectAll();
  });
});