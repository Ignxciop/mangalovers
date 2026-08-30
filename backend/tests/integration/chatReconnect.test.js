import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
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

async function connectAndWait(token) {
  const client = await connectSocketClient(serverCtx.url, token);
  await waitForSocketEvent(client, "connect");
  return client;
}

beforeAll(async () => {
  serverCtx = await createSocketTestServer();
});

afterAll(async () => {
  await serverCtx.close();
});

describe("reconexión: el historial REST es la fuente de verdad", () => {
  it("los mensajes creados durante la desconexión se recuperan al reconectar y el cliente vuelve a chat:global", async () => {
    const user = await createUser();
    const token = generateAccessToken(user.id);

    const first = await connectAndWait(token);
    first.disconnect();

    const reactor = await createUser();
    const reactorClient = await connectAndWait(generateAccessToken(reactor.id));

    const duranteElCorte = [];
    for (let i = 1; i <= 3; i++) {
      duranteElCorte.push(
        await prisma.chatMessage.create({
          data: { userId: reactor.id, content: `durante el corte ${i}` },
        }),
      );
    }

    const reconnected = await connectAndWait(token);
    const rejoinEvent = waitForSocketEvent(reconnected, "chat:message");

    let ackResult;
    reactorClient.emit(
      "chat:send",
      { content: "mensaje tras reconectar" },
      (ack) => {
        ackResult = ack;
      },
    );
    const ack = await waitForCondition(() => ackResult);
    expect(ack.ok).toBe(true);

    const broadcast = await rejoinEvent;
    expect(broadcast.content).toBe("mensaje tras reconectar");
    expect(broadcast.user.id).toBe(reactor.id);

    reactorClient.disconnect();
    reconnected.disconnect();

    const res = await request(serverCtx.server)
      .get("/api/chat/messages")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const ids = res.body.data.messages.map((m) => m.id);
    duranteElCorte.forEach((msg) => expect(ids).toContain(msg.id));
    expect(ids).toContain(broadcast.id);
    expect(res.body.data.messages).toHaveLength(4);
  });
});