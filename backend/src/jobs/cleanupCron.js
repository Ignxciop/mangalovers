import cron from "node-cron";
import { prisma } from "../config/prisma.js";
import logger from "../config/logger.js";

export function initCleanupCron() {
  cron.schedule("5 * * * *", async () => {
    logger.info("Cleanup cron: eliminando refresh tokens expirados...");

    try {
      const { count } = await prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (count > 0) {
        logger.info({ deletedTokens: count }, "Cleanup cron completado");
      }
    } catch (error) {
      logger.error({ err: error }, "Error en cleanup cron");
    }
  });

  logger.info("Cleanup cron inicializado (cada 1 hora, minuto 5)");
}
