import cron from "node-cron";
import { prisma } from "../config/prisma.js";
import logger from "../config/logger.js";

export function initCleanupCron() {
  cron.schedule("5 * * * *", async () => {
    logger.info("Cleanup cron: eliminando refresh tokens expirados y activity logs viejos...");

    try {
      const { count } = await prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (count > 0) {
        logger.info({ deletedTokens: count }, "Cleanup cron: refresh tokens eliminados");
      }
    } catch (error) {
      logger.error({ err: error }, "Error en cleanup cron (refresh tokens)");
    }

    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const { count: deletedLogs } = await prisma.userActivity.deleteMany({
        where: { createdAt: { lt: ninetyDaysAgo } },
      });
      if (deletedLogs > 0) {
        logger.info({ deletedLogs }, "Cleanup cron: activity logs antiguos eliminados");
      }
    } catch (error) {
      logger.error({ err: error }, "Error en cleanup cron (activity logs)");
    }
  });

  logger.info("Cleanup cron inicializado (cada 1 hora, minuto 5)");
}
