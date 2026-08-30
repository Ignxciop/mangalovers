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
});