import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", message: "Server está activo" });
});

app.listen(PORT, () => {
    console.log("Servidor escuchando en puerto ", PORT);
});
