import { prisma } from "../config/prisma.js";
import logger from "../config/logger.js";

const providers = [{ name: "olympus" }, { name: "manhwaweb" }, { name: "leermangaesp" }];

export async function seedProviders() {
    logger.info("Verificando providers...");

    for (const provider of providers) {
        const exists = await prisma.provider.findUnique({
            where: { name: provider.name },
        });

        if (!exists) {
            await prisma.provider.create({
                data: provider,
            });

            logger.info({ name: provider.name }, "Provider creado");
        } else {
            logger.debug({ name: provider.name }, "Provider ya existe");
        }
    }

    logger.info("Seed de providers terminado");
}
