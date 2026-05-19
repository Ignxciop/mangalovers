import bcrypt from "bcryptjs";
import { prisma } from "./prisma.js";

export async function createUser(overrides = {}) {
    const { password: plainPassword, ...rest } = overrides;
    const email =
        rest.email ||
        `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@gmail.com`;
    return prisma.user.create({
        data: {
            email,
            password: await bcrypt.hash(plainPassword || "Password123!", 10),
            name: "Test",
            lastname: "User",
            ...rest,
            email,
        },
    });
}

export async function createSeries(overrides = {}) {
    return prisma.series.create({
        data: {
            name: "Test Series",
            slug: `ts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            status: "En emisión",
            type: "Manga",
            chapterCount: 0,
            ...overrides,
        },
    });
}

export async function createChapter(seriesId, overrides = {}) {
    return prisma.chapter.create({
        data: {
            seriesId,
            name: "1",
            publishedAt: new Date(),
            pagesScraped: true,
            ...overrides,
        },
    });
}

export async function createGenre(name) {
    return prisma.genre.create({ data: { name } });
}

export async function createProvider(name) {
    return prisma.provider.create({ data: { name } });
}
