import {
    getReadChapterIds,
    toggleChapterRead,
    markChaptersUntil,
} from "./readService.js";

export async function handleGetReadChapters(req, res) {
    try {
        const { seriesId } = req.params;
        const ids = await getReadChapterIds(req.user.userId, seriesId);
        res.json(ids);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
}

export async function handleToggleChapterRead(req, res) {
    try {
        const { chapterId } = req.params;
        const result = await toggleChapterRead(req.user.userId, chapterId);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
}

export async function handleMarkChaptersUntil(req, res) {
    try {
        const { chapterId } = req.params;

        const result = await markChaptersUntil(req.user.userId, chapterId);

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
}
