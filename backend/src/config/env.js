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
    VAPID_PUBLIC_KEY:
        process.env.VAPID_PUBLIC_KEY?.trim().replace(/=+$/, "") ||
        "your-vapid-public-key",
    VAPID_PRIVATE_KEY:
        process.env.VAPID_PRIVATE_KEY?.trim() || "your-vapid-public-key",
    VAPID_EMAIL: process.env.VAPID_EMAIL || "your-vapid-email",
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
};
