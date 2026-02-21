import { getAllManga, getLatestManga } from "./mangaService.js";

export async function handleGetAllManga(req, res) {
    try {
        const result = await getAllManga(req.query);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

export async function handleGetLatestManga(req, res) {
    try {
        const limit = Number(req.query.limit) || 16;

        const manga = await getLatestManga(limit);

        res.json(manga);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error obteniendo últimos mangas" });
    }
}
