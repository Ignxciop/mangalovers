import dotenv from "dotenv";
import { beforeAll, beforeEach, afterAll } from "vitest";
import { prisma } from "./helpers/prisma.js";

dotenv.config({ quiet: true });
process.env.DATABASE_URL = process.env.DATABASE_TEST_URL;

import logger from "../src/config/logger.js";

const TABLE_NAMES = [
    "user_chapter_reads",
    "user_favorites",
    "push_subscriptions",
    "refresh_tokens",
    "ProviderChapter",
    "ProviderSeries",
    "SeriesGenre",
    "Page",
    "Chapter",
    "series_aliases",
    "Series",
    "Genre",
    "Provider",
    "users",
];

beforeAll(async () => {
    try {
        await prisma.$connect();
        logger.info("Test DB connected");
    } catch (err) {
        logger.error({ err: err.message }, "Failed to connect to test DB. Ensure PostgreSQL is running and DATABASE_TEST_URL is correct in .env");
        throw err;
    }
});

beforeEach(async () => {
    for (const name of TABLE_NAMES) {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${name}" CASCADE;`);
    }
});

afterAll(async () => {
    await prisma.$disconnect();
});
