import dotenv from "dotenv";

dotenv.config({ quiet: true });

function requireEnv(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`La variable de entorno ${key} es requerida`);
    }
    return value;
}

export const config = {
    ENVIRONMENT: process.env.ENVIRONMENT || process.env.NODE_ENV || "development",
    PORT: process.env.PORT || 3000,
    JWT_SECRET: requireEnv("JWT_SECRET"),
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
    JWT_REFRESH_SECRET: requireEnv("JWT_REFRESH_SECRET"),
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    VAPID_PUBLIC_KEY: requireEnv("VAPID_PUBLIC_KEY").trim(),
    VAPID_PRIVATE_KEY: requireEnv("VAPID_PRIVATE_KEY").trim(),
    VAPID_EMAIL: requireEnv("VAPID_EMAIL"),
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
};
