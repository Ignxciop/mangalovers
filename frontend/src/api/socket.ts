import { io, type Socket } from "socket.io-client";

const SOCKET_URL = (import.meta.env.VITE_API_URL ?? "").replace("/api", "");

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token: string | null): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    path: "/api/socket.io",
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 10000,
    withCredentials: true,
  });

  socket.on("connect", () => {
    console.log("[WS] Conectado:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[WS] Desconectado:", reason);
  });

  socket.on("connect_error", (err) => {
    console.warn("[WS] Error de conexion:", err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
