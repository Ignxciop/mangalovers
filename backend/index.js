import { config } from "./src/config/env.js";
import express from "express";

const app = express();
const PORT = config.PORT;

app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", message: "Server está activo" });
});

app.listen(PORT, () => {
    console.log("Servidor escuchando en puerto ", PORT);
});
