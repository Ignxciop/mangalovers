import dotenv from "dotenv";

dotenv.config({ quiet: true });

export const config = {
    PORT: process.env.PORT || 3000,
};
