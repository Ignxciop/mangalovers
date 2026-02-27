import {
    getReadChapterIds,
    toggleChapterRead,
    markChaptersUntil,
    unmarkChaptersFrom,
    getUserReadingStats,
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

export const handleToggleChapterRead = async (req, res) => {
    try {
        const userId = req.user.userId;
        const chapterId = Number(req.params.chapterId);

        const result = await toggleChapterRead(userId, chapterId);

        return res.json(result);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error toggling chapter read" });
    }
};

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

export async function handleGetReadingStats(req, res) {
    try {
        const stats = await getUserReadingStats(req.user.userId);
        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
}
