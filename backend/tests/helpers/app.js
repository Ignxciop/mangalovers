import express from "express";
import cookieParser from "cookie-parser";
import { errorHandler } from "../../src/middlewares/errorHandler.js";
import authRoutes from "../../src/auth/authRoutes.js";
import mangaRoutes from "../../src/manga/mangaRoutes.js";
import favoriteRoutes from "../../src/favorite/favoriteRoutes.js";
import readRoutes from "../../src/read/readRoutes.js";
import notificationRoutes from "../../src/notifications/notificationRoutes.js";
import suggestionRoutes from "../../src/suggestions/suggestionRoutes.js";
import friendRoutes from "../../src/friends/friendRoutes.js";
import adminRoutes from "../../src/admin/adminUserRoutes.js";
import activityLogRoutes from "../../src/activityLog/activityLogRoutes.js";
import commentRoutes from "../../src/comments/commentRoutes.js";
import chatRoutes from "../../src/chat/chatRoutes.js";

export function buildApp() {
    const app = express();
    app.use(express.json({ limit: "100kb" }));
    app.use(cookieParser());

    app.get("/api/health", (_req, res) => {
        res.status(200).json({ status: "OK", message: "Server está activo" });
    });
    app.use("/api/auth", authRoutes);
    app.use("/api/manga", mangaRoutes);
    app.use("/api/favorites", favoriteRoutes);
    app.use("/api/reads", readRoutes);
    app.use("/api/notifications", notificationRoutes);
    app.use("/api/suggestions", suggestionRoutes);
    app.use("/api/friends", friendRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/admin", activityLogRoutes);
    app.use("/api/comments", commentRoutes);
    app.use("/api/chat", chatRoutes);

    app.use(errorHandler);

    return app;
}
