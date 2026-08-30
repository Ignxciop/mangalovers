import { Server } from "socket.io";
import { socketAuthMiddleware } from "./authMiddleware.js";
import { registerPresenceOnConnect } from "./presenceHandler.js";
import { registerChatHandler } from "./chatHandler.js";
import { registerNotificationNamespace } from "./notificationHandler.js";
import { registerAdminNamespace } from "./adminHandler.js";
import { setAdminEmitterIO } from "./adminEmitter.js";
import { prisma } from "../config/prisma.js";
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
  });

  io.use(socketAuthMiddleware);

  setAdminEmitterIO(io);

  io.on("connection", (socket) => {
    logger.info(
      { socketId: socket.id, userId: socket.data.userId },
      "Cliente conectado",
    );

    if (socket.data.userId) {
      socket.join(`user:${socket.data.userId}`);

      Promise.all([
        prisma.notification.count({
          where: { userId: socket.data.userId, read: false },
        }),
        prisma.friend.count({
          where: { receiverId: socket.data.userId, status: "PENDING" },
        }),
      ]).then(([unreadCount, pendingCount]) => {
        socket.emit("unread:count", { count: unreadCount });
        socket.emit("friend:pending_count", { count: pendingCount });
      }).catch((err) => {
        logger.error({ err }, "Error al emitir conteos iniciales al conectar socket");
      });
    }

    if (socket.data.role === "ADMIN") {
      socket.join("admin");
    }

    registerPresenceOnConnect(io, socket);
    registerChatHandler(io, socket);

    socket.on("disconnect", (reason) => {
      logger.info(
        { socketId: socket.id, userId: socket.data.userId, reason },
        "Cliente desconectado",
      );
    });
  });

  registerNotificationNamespace(io);
  registerAdminNamespace(io);

  logger.info("Socket.IO inicializado");
  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.IO no inicializado");
  }
  return io;
}
