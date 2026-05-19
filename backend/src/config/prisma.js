import pkg from "@prisma/client";
import logger from "./logger.js";

const { PrismaClient } = pkg;

const prisma = new PrismaClient({
    log: [
        { level: "query", emit: "event" },
        { level: "error", emit: "event" },
        { level: "info", emit: "event" },
        { level: "warn", emit: "event" },
    ],
});

prisma.$on("query", (e) => logger.debug({ query: e.query, duration: e.duration }, "Prisma query"));
prisma.$on("error", (e) => logger.error(e, "Prisma error"));
prisma.$on("info", (e) => logger.info(e, "Prisma info"));
prisma.$on("warn", (e) => logger.warn(e, "Prisma warning"));

export { prisma };
