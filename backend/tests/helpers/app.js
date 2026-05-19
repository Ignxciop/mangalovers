import express from "express";
import cookieParser from "cookie-parser";
import { errorHandler } from "../../src/middlewares/errorHandler.js";
import authRoutes from "../../src/auth/authRoutes.js";
import mangaRoutes from "../../src/manga/mangaRoutes.js";
import favoriteRoutes from "../../src/favorite/favoriteRoutes.js";
import readRoutes from "../../src/read/readRoutes.js";

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

    app.use(errorHandler);

    return app;
}
