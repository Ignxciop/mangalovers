import { prisma } from "../config/prisma.js";

const providers = [
    {
        name: "olympus",
        name: "manhwaweb",
    },
];

export async function seedProviders() {
    console.log("Verificando providers...");

    for (const provider of providers) {
        const exists = await prisma.provider.findUnique({
            where: { name: provider.name },
        });

        if (!exists) {
            await prisma.provider.create({
                data: provider,
            });

            console.log(`Provider creado: ${provider.name}`);
        } else {
            console.log(`Provider ya existe: ${provider.name}`);
        }
    }

    console.log("Seed de providers terminado");
}
