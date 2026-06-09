import { Server } from "socket.io";
import { socketAuthMiddleware } from "./authMiddleware.js";
import logger from "../config/logger.js";

let io;

export function initSocket(server) {
  io = new Server(server, {
    path: "/api/socket.io",
    cors: {
      origin: (process.env.FRONTEND_URL || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    logger.info(
      { socketId: socket.id, userId: socket.data.userId },
      "Cliente conectado",
    );

    socket.on("disconnect", (reason) => {
      logger.info(
        { socketId: socket.id, userId: socket.data.userId, reason },
        "Cliente desconectado",
      );
    });
  });

  logger.info("Socket.IO inicializado");
  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.IO no inicializado");
  }
  return io;
}
