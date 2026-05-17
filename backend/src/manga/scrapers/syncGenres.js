import { prisma } from "../../config/prisma.js";
import { normalizeGenre } from "./normalizeGenre.js";

export async function syncGenres(seriesId, genreNames, tx = prisma) {
    for (const rawName of genreNames) {
        const name = normalizeGenre(rawName);
        if (!name) continue;

        const genre = await tx.genre.upsert({
            where: { name },
            create: { name },
            update: {},
        });

        await tx.seriesGenre.upsert({
            where: { seriesId_genreId: { seriesId, genreId: genre.id } },
            create: { seriesId, genreId: genre.id },
            update: {},
        });
    }
}
