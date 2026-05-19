import { config as dotenvConfig } from "dotenv";
dotenvConfig({ quiet: true });

import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
    datasources: {
        db: { url: process.env.DATABASE_TEST_URL },
    },
});
