import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    socket.data.userId = null;
    socket.data.role = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    socket.data.userId = decoded.userId;
    socket.data.role = decoded.role;
    next();
  } catch (err) {
    next(new Error("Token invalido o expirado"));
  }
}
