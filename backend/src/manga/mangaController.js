import {
    getAllManga,
    getLatestManga,
    getSeriesDetailBySlug,
    getChapterPages,
    getAllGenres,
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

export async function handleGetAllGenres(req, res) {
    try {
        const genres = await getAllGenres();
        res.json(genres);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error obteniendo géneros" });
    }
}

export async function handleGetLatestManga(req, res) {
    try {
        const limit = Number(req.query.limit) || 16;
        const userId = req.user?.userId ?? null;
        const manga = await getLatestManga(userId, limit);
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

export async function handleGetChapterPages(req, res) {
    try {
        const { chapterId } = req.params;
        if (isNaN(Number(chapterId))) {
            return res.status(400).json({ message: "ID de capítulo inválido" });
        }

        const chapter = await getChapterPages(
            chapterId,
            req.user?.userId ?? null,
        );

        if (!chapter) {
            return res.status(404).json({ message: "Capítulo no encontrado" });
        }

        return res.json(chapter);
    } catch (error) {
        console.error("Error obteniendo páginas del capítulo:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
}
