import jwt from "jsonwebtoken";
import { config } from "../../src/config/env.js";

export function generateAccessToken(user) {
    const userId = typeof user === "string" ? user : user.id;
    const role = typeof user === "object" ? user.role : undefined;
    return jwt.sign({ userId, role }, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRES_IN,
    });
}
