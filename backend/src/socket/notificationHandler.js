import logger from "../config/logger.js";

export function registerNotificationNamespace(io) {
  const ns = io.of("/notifications");

  ns.use((socket, next) => {
    if (!socket.data.userId) return next(new Error("No autenticado"));
    next();
  });

  ns.on("connection", (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);
    logger.info({ userId }, "Usuario unido a /notifications");
  });
}
