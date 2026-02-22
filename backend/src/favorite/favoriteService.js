import { prisma } from "../config/prisma.js";

export async function getUserFavorites(userId) {
    return prisma.userFavorite.findMany({
        where: { userId },
        include: {
            series: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    cover: true,
                    status: true,
                    chapterCount: true,
                },
            },
        },
        orderBy: { updatedAt: "desc" },
    });
}

export async function getFavorite(userId, seriesId) {
    return prisma.userFavorite.findUnique({
        where: { userId_seriesId: { userId, seriesId: Number(seriesId) } },
    });
}

export async function upsertFavorite(userId, seriesId, status) {
    return prisma.userFavorite.upsert({
        where: { userId_seriesId: { userId, seriesId: Number(seriesId) } },
        update: { status },
        create: { userId, seriesId: Number(seriesId), status },
    });
}

export async function deleteFavorite(userId, seriesId) {
    return prisma.userFavorite.delete({
        where: { userId_seriesId: { userId, seriesId: Number(seriesId) } },
    });
}
