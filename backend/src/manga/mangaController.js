import {
    getAllManga,
    getLatestManga,
    getSeriesDetailBySlug,
} from "./mangaService.js";

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

export async function getSeriesDetail(req, res) {
    try {
        const { slug } = req.params;

        const series = await getSeriesDetailBySlug(slug);

        if (!series) {
            return res.status(404).json({
                message: "Serie no encontrada",
            });
        }

        return res.json(series);
    } catch (error) {
        console.error("Error obteniendo detalle de serie:", error);
        return res.status(500).json({
            message: "Error interno del servidor",
        });
    }
}
