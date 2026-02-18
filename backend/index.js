import { config } from "./src/config/env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { errorHandler } from "./src/middlewares/errorHandle.js";
import authRoutes from "./src/auth/authRoutes.js";

const app = express();
const PORT = config.PORT;

app.use(helmet());
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true,
    }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", message: "Server está activo" });
});
app.use("/api/auth", authRoutes);

app.use(errorHandler);
app.listen(PORT, () => {
    console.log("Servidor escuchando en puerto ", PORT);
});
