import http from "node:http";
import { buildApp } from "./app.js";
import { initSocket } from "../../src/socket/index.js";

export async function createSocketTestServer() {
  const app = buildApp();
  const server = http.createServer(app);
  initSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  return {
    url: `http://localhost:${port}`,
    server,
    close: () =>
      new Promise((resolve) => server.close(() => resolve())),
  };
}

export function connectSocketClient(url, token) {
  return import("socket.io-client").then(({ io }) =>
    io(url, {
      path: "/api/socket.io",
      auth: { token },
      reconnection: false,
      timeout: 5000,
    }),
  );
}

export function waitForSocketEvent(client, event) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout esperando evento ${event}`)),
      5000,
    );
    client.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

export async function waitForCondition(fn, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = fn();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Timeout esperando condición");
}