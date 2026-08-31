import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createUser } from "../helpers/factories.js";
import { generateAccessToken } from "../helpers/auth.js";
import { prisma } from "../helpers/prisma.js";
import {
  createSocketTestServer,
  connectSocketClient,
  waitForSocketEvent,
} from "../helpers/socket.js";

let serverCtx;
let clients = [];

async function connectUser(userId, events = []) {
  const client = await connectSocketClient(serverCtx.url, generateAccessToken(userId));
  const pending = events.map((event) => ({
    event,
    promise: waitForSocketEvent(client, event),
  }));
  clients.push(client);
  await waitForSocketEvent(client, "connect");
  return { client, pending, waitFor: (event) => {
    const entry = pending.find((p) => p.event === event);
    return entry ? entry.promise : waitForSocketEvent(client, event);
  } };
}

function disconnectAll() {
  clients.forEach((c) => c.disconnect());
  clients = [];
}

async function makeFriends(a, b) {
  await prisma.friend.create({
    data: { senderId: a.id, receiverId: b.id, status: "ACCEPTED" },
  });
}

function waitForChatCount(client, target) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout esperando chat:online_count=${target}`)),
      5000,
    );
    const handler = (payload) => {
      if (payload.count === target) {
        clearTimeout(timer);
        client.off("chat:online_count", handler);
        resolve(payload);
      }
    };
    client.on("chat:online_count", handler);
  });
}

beforeAll(async () => {
  serverCtx = await createSocketTestServer();
});

afterAll(async () => {
  disconnectAll();
  await serverCtx.close();
});

describe("presencia por visibilidad del perfil", () => {
  it("un usuario visible aparece como online para un amigo conectado", async () => {
    const a = await createUser();
    const b = await createUser();
    await makeFriends(a, b);

    await connectUser(a.id);
    const { waitFor: waitForB } = await connectUser(b.id, [
      "presence:online_list",
    ]);

    const onlineList = await waitForB("presence:online_list");
    expect(onlineList.userIds).toContain(a.id);

    disconnectAll();
  });

  it("perfil PRIVATE emite friend:offline y deja de aparecer en la lista de amigos", async () => {
    const a = await createUser();
    const b = await createUser();
    await makeFriends(a, b);

    const { client: clientA } = await connectUser(a.id);
    const { waitFor: waitForB } = await connectUser(b.id);

    await prisma.user.update({
      where: { id: a.id },
      data: { profileVisibility: "PRIVATE" },
    });

    const offlinePromise = waitForB("friend:offline");
    clientA.emit("presence:refresh");
    const offline = await offlinePromise;
    expect(offline.userId).toBe(a.id);

    const c = await createUser();
    await makeFriends(a, c);
    const { waitFor: waitForC } = await connectUser(c.id, [
      "presence:online_list",
    ]);
    const onlineList = await waitForC("presence:online_list");
    expect(onlineList.userIds).not.toContain(a.id);

    disconnectAll();
  });

  it("al volver a PUBLIC el amigo vuelve a recibir friend:online", async () => {
    const a = await createUser();
    const b = await createUser();
    await makeFriends(a, b);

    await prisma.user.update({
      where: { id: a.id },
      data: { profileVisibility: "PRIVATE" },
    });

    const { client: clientA } = await connectUser(a.id);
    const { waitFor: waitForB } = await connectUser(b.id);

    await prisma.user.update({
      where: { id: a.id },
      data: { profileVisibility: "PUBLIC" },
    });

    const onlinePromise = waitForB("friend:online");
    clientA.emit("presence:refresh");
    const online = await onlinePromise;
    expect(online.userId).toBe(a.id);

    disconnectAll();
  });

  it("un perfil PRIVATE sigue contando en el conteo total del chat", async () => {
    const a = await createUser({ profileVisibility: "PRIVATE" });
    const b = await createUser();
    await makeFriends(a, b);

    await connectUser(a.id);

    const clientB = await connectSocketClient(serverCtx.url, generateAccessToken(b.id));
    const chatCountPromise = waitForChatCount(clientB, 2);
    const onlineListPromise = waitForSocketEvent(clientB, "presence:online_list");
    clients.push(clientB);
    await waitForSocketEvent(clientB, "connect");

    const chatCount = await chatCountPromise;
    expect(chatCount.count).toBe(2);

    const onlineList = await onlineListPromise;
    expect(onlineList.userIds).not.toContain(a.id);

    disconnectAll();
  });
});