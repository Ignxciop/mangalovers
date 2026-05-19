import jwt from "jsonwebtoken";
import { config } from "../../src/config/env.js";

export function generateAccessToken(userId) {
    return jwt.sign({ userId }, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRES_IN,
    });
}
