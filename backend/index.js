import { config } from "./src/config/env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { errorHandler } from "./src/middlewares/errorHandle.js";
import authRoutes from "./src/auth/authRoutes.js";
import mangaRoutes from "./src/manga/mangaRoutes.js";
import favoriteRoutes from "./src/favorite/favoriteRoutes.js";
import readRoutes from "./src/read/readRoutes.js";
import { initScraperCron } from "./src/jobs/scraperCron.js";
import { seedProviders } from "./src/scripts/seed.js";

const app = express();
const PORT = config.PORT;

app.use(helmet());
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true,
    }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", message: "Server está activo" });
});
app.use("/api/auth", authRoutes);
app.use("/api/manga", mangaRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/reads", readRoutes);

app.use(errorHandler);

async function startServer() {
    await seedProviders();

    app.listen(PORT, () => {
        console.log(`Servidor corriendo en puerto ${PORT}`);
    });

    initScraperCron();
}

startServer();
