import { config } from "./src/config/env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./src/middlewares/errorHandler.js";
import { attachLogger } from "./src/middlewares/attachLogger.js";
import pinoHttp from "pino-http";
import logger from "./src/config/logger.js";
import authRoutes from "./src/auth/authRoutes.js";
import mangaRoutes from "./src/manga/mangaRoutes.js";
import favoriteRoutes from "./src/favorite/favoriteRoutes.js";
import readRoutes from "./src/read/readRoutes.js";
import { initScraperCron } from "./src/jobs/scraperCron.js";
import { initCleanupCron } from "./src/jobs/cleanupCron.js";
import { seedProviders } from "./src/scripts/seed.js";
import notificationRoutes from "./src/notifications/notificationRoutes.js";
import sitemapRoutes from "./src/sitemap/sitemapRoutes.js";
import suggestionRoutes from "./src/suggestions/suggestionRoutes.js";
import adminRoutes from "./src/admin/adminUserRoutes.js";
import activityLogRoutes from "./src/activityLog/activityLogRoutes.js";
import { ActivityLogService } from "./src/activityLog/activityLogService.js";
import { prisma } from "./src/config/prisma.js";

const app = express();
const PORT = config.PORT;

app.set("trust proxy", 1);

const isTest = process.env.VITEST === "true";

const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || "").split(",").map((s) => s.trim()).filter(Boolean);

app.use(helmet());
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || ALLOWED_ORIGINS.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Origen no permitido por CORS"));
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    }),
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.use(pinoHttp({
    logger,
    autoLogging: isTest ? false : undefined,
    serializers: {
        req: (req) => ({
            method: req.method,
            url: req.url,
        }),
        res: (res) => ({
            statusCode: res.statusCode,
        }),
    },
}));
app.use(attachLogger);

function rateLimitHandler(message) {
  return async (req, res) => {
    if (req.user?.userId) {
      try {
        await ActivityLogService.logEvent(
          req.user.userId, "RATE_LIMIT",
          { route: req.originalUrl, method: req.method },
          req.ip, req.headers["user-agent"],
        );
      } catch { /* ignore */ }
    }
    res.status(429).json({ success: false, message });
  };
}

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler("Demasiadas solicitudes, intenta de nuevo más tarde"),
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler("Demasiadas solicitudes, intenta de nuevo más tarde"),
});

const heavyLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler("Demasiadas solicitudes, intenta de nuevo más tarde"),
});

const favoriteLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler("Demasiados cambios en favoritos"),
});

app.use("/api", generalLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/reads/full-stats", heavyLimiter);
app.use("/api/reads/stats", heavyLimiter);
app.use("/api/manga/recommended", heavyLimiter);
app.use("/api/favorites", favoriteLimiter);

app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "OK", message: "Server está activo" });
});
app.get("/api/debug/log-test", async (req, res) => {
    try {
        const { userId, event = "LOGIN" } = req.query;
        if (!userId) return res.status(400).json({ error: "Falta userId" });
        const result = await ActivityLogService.logEvent(userId, event, { test: true }, req.ip, req.headers["user-agent"]);
        res.json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
app.use("/api/auth", authRoutes);
app.use("/api/manga", mangaRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/reads", readRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/suggestions", suggestionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", activityLogRoutes);
app.use("/api", sitemapRoutes);

app.use(errorHandler);

async function startServer() {
    await seedProviders();

    try {
        await prisma.userActivity.count({ take: 1 });
        logger.info("Tabla user_activities accesible");
    } catch (e) {
        logger.warn({ err: e.message }, "Tabla user_activities NO accesible - revisar migraciones");
    }

    app.listen(PORT, () => {
        logger.info({ port: PORT }, "Servidor corriendo");
    });

    initScraperCron();
    initCleanupCron();
}

startServer();
