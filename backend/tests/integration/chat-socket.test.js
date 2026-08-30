import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createUser } from "../helpers/factories.js";
import { generateAccessToken } from "../helpers/auth.js";
import { prisma } from "../helpers/prisma.js";
import {
  createSocketTestServer,
  connectSocketClient,
  waitForSocketEvent,
  waitForCondition,
} from "../helpers/socket.js";

let serverCtx;
let clients = [];

async function connectUser(userId) {
  const client = await connectSocketClient(serverCtx.url, generateAccessToken(userId));
  clients.push(client);
  await waitForSocketEvent(client, "connect");
  return client;
}

function disconnectAll() {
  clients.forEach((c) => c.disconnect());
  clients = [];
}

function sendAndGetAck(client, content, isSpoiler = false) {
  let ackResult;
  client.emit("chat:send", { content, isSpoiler }, (ack) => {
    ackResult = ack;
  });
  return waitForCondition(() => ackResult);
}

async function createMute(userId, mutedUntil) {
  const admin = await createUser();
  return prisma.chatMute.create({
    data: { userId, mutedById: admin.id, mutedUntil },
  });
}

beforeAll(async () => {
  serverCtx = await createSocketTestServer();
});

afterAll(async () => {
  disconnectAll();
  await serverCtx.close();
});

describe("chat:send socket global", () => {
  it("se une a chat:global, persiste el mensaje, responde ack ok y hace broadcast", async () => {
    const user1 = await createUser({ alias: "socketa" });
    const user2 = await createUser({ alias: "socketb" });

    const client1 = await connectUser(user1.id);
    const client2 = await connectUser(user2.id);

    const broadcastPromise = waitForSocketEvent(client2, "chat:message");

    let ackResult;
    client1.emit(
      "chat:send",
      { content: "hola mundo!" },
      (ack) => {
        ackResult = ack;
      },
    );

    const ack = await waitForCondition(() => ackResult);
    expect(ack.ok).toBe(true);
    expect(ack.message.content).toBe("hola mundo!");
    expect(ack.message.isSpoiler).toBe(false);
    expect(ack.message.user.id).toBe(user1.id);
    expect(ack.message.user.alias).toBe("socketa");

    const broadcast = await broadcastPromise;
    expect(broadcast.content).toBe("hola mundo!");
    expect(broadcast.user.id).toBe(user1.id);

    const persisted = await prisma.chatMessage.count({
      where: { content: "hola mundo!", userId: user1.id },
    });
    expect(persisted).toBe(1);

    disconnectAll();
  });

  it("rechaza contenido con HTML con INVALID_CONTENT sin persistir", async () => {
    const user = await createUser();
    const client = await connectUser(user.id);

    let ackResult;
    client.emit("chat:send", { content: "<b>malicioso</b>" }, (ack) => {
      ackResult = ack;
    });

    const ack = await waitForCondition(() => ackResult);
    expect(ack.ok).toBe(false);
    expect(ack.error).toBe("INVALID_CONTENT");

    const persisted = await prisma.chatMessage.count();
    expect(persisted).toBe(0);

    disconnectAll();
  });

  it("rechaza contenido vacío con INVALID_CONTENT", async () => {
    const user = await createUser();
    const client = await connectUser(user.id);

    let ackResult;
    client.emit("chat:send", { content: "   " }, (ack) => {
      ackResult = ack;
    });

    const ack = await waitForCondition(() => ackResult);
    expect(ack.ok).toBe(false);
    expect(ack.error).toBe("INVALID_CONTENT");

    disconnectAll();
  });

  it("rechaza contenido de más de 300 caracteres", async () => {
    const user = await createUser();
    const client = await connectUser(user.id);

    let ackResult;
    client.emit("chat:send", { content: "a".repeat(301) }, (ack) => {
      ackResult = ack;
    });

    const ack = await waitForCondition(() => ackResult);
    expect(ack.ok).toBe(false);
    expect(ack.error).toBe("INVALID_CONTENT");

    disconnectAll();
  });

  it("permite texto casual con etiqueta sin cerrar como <final>", async () => {
    const user = await createUser();
    const client = await connectUser(user.id);

    const ack = await sendAndGetAck(client, "capitulo 5 <final>");
    expect(ack.ok).toBe(true);

    disconnectAll();
  });
});

describe("chat:send rate limiting", () => {
  it("rechaza con RATE_LIMITED los excedentes sin persistirlos", async () => {
    const user = await createUser();
    const client = await connectUser(user.id);

    const acks = [];
    for (let i = 1; i <= 6; i++) {
      client.emit(
        "chat:send",
        { content: `mensaje rate ${i}` },
        (ack) => acks.push(ack),
      );
    }
    await waitForCondition(() => acks.length === 6);

    const okCount = acks.filter((a) => a.ok).length;
    const limitedCount = acks.filter((a) => a.error === "RATE_LIMITED").length;

    expect(okCount).toBe(5);
    expect(limitedCount).toBe(1);

    const persisted = await prisma.chatMessage.count({ where: { userId: user.id } });
    expect(persisted).toBe(5);

    disconnectAll();
  });
});

describe("chat:send con mute/ban", () => {
  it("rechaza con MUTED y mutedUntil si el mute está activo en el futuro", async () => {
    const user = await createUser();
    const mutedUntil = new Date(Date.now() + 60 * 60 * 1000);
    await createMute(user.id, mutedUntil);
    const client = await connectUser(user.id);

    const ack = await sendAndGetAck(client, "mensaje silenciado");
    expect(ack.ok).toBe(false);
    expect(ack.error).toBe("MUTED");
    expect(ack.mutedUntil).toBeDefined();

    const persisted = await prisma.chatMessage.count({ where: { userId: user.id } });
    expect(persisted).toBe(0);

    disconnectAll();
  });

  it("rechaza con MUTED y mutedUntil null para mute permanente", async () => {
    const user = await createUser();
    await createMute(user.id, null);
    const client = await connectUser(user.id);

    const ack = await sendAndGetAck(client, "mensaje silenciado");
    expect(ack.ok).toBe(false);
    expect(ack.error).toBe("MUTED");
    expect(ack.mutedUntil).toBeNull();

    disconnectAll();
  });

  it("permite enviar cuando el mute ya expiró", async () => {
    const user = await createUser();
    await createMute(user.id, new Date(Date.now() - 1000));
    const client = await connectUser(user.id);

    const ack = await sendAndGetAck(client, "mute expirado");
    expect(ack.ok).toBe(true);

    const persisted = await prisma.chatMessage.count({ where: { userId: user.id } });
    expect(persisted).toBe(1);

    disconnectAll();
  });

  it("rechaza con MUTED a un usuario BANNED", async () => {
    const user = await createUser({ status: "BANNED" });
    const client = await connectUser(user.id);

    const ack = await sendAndGetAck(client, "mensaje baneado");
    expect(ack.ok).toBe(false);
    expect(ack.error).toBe("MUTED");

    const persisted = await prisma.chatMessage.count({ where: { userId: user.id } });
    expect(persisted).toBe(0);

    disconnectAll();
  });

  it("rechaza con MUTED a un usuario SUSPENDED hasta el futuro", async () => {
    const user = await createUser({
      status: "SUSPENDED",
      suspendedUntil: new Date(Date.now() + 60 * 60 * 1000),
    });
    const client = await connectUser(user.id);

    const ack = await sendAndGetAck(client, "mensaje suspendido");
    expect(ack.ok).toBe(false);
    expect(ack.error).toBe("MUTED");

    disconnectAll();
  });
});

describe("chat:send mensajes duplicados", () => {
  it("rechaza el mismo mensaje consecutivo con DUPLICATE_MESSAGE y permite tras uno intermedio", async () => {
    const user = await createUser();
    const client = await connectUser(user.id);

    const first = await sendAndGetAck(client, "mensaje duplicado");
    expect(first.ok).toBe(true);

    const dup = await sendAndGetAck(client, "mensaje duplicado");
    expect(dup.ok).toBe(false);
    expect(dup.error).toBe("DUPLICATE_MESSAGE");

    const intermedio = await sendAndGetAck(client, "otra cosa");
    expect(intermedio.ok).toBe(true);

    const repeat = await sendAndGetAck(client, "mensaje duplicado");
    expect(repeat.ok).toBe(true);

    const persisted = await prisma.chatMessage.count({ where: { userId: user.id } });
    expect(persisted).toBe(3);

    disconnectAll();
  });
});