import dotenv from "dotenv";

dotenv.config({ quiet: true });

export const config = {
    PORT: process.env.PORT || 3000,
    JWT_SECRET:
        process.env.JWT_SECRET || "your-secret-key-change-in-production",
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
    JWT_REFRESH_SECRET:
        process.env.JWT_REFRESH_SECRET ||
        "your-refresh-secret-key-change-in-production",
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
};
