import logger from "../config/logger.js";

export function registerAdminNamespace(io) {
  const ns = io.of("/admin");

  ns.use((socket, next) => {
    if (!socket.data.userId) return next(new Error("No autenticado"));
    if (socket.data.role !== "ADMIN") return next(new Error("No autorizado"));
    next();
  });

  ns.on("connection", (socket) => {
    socket.join("admin");
    logger.info({ userId: socket.data.userId }, "Admin conectado a /admin");
  });
}
