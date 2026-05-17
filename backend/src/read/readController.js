import {
    getReadChapterIds,
    toggleChapterRead,
    markChaptersUntil,
    unmarkChaptersFrom,
    getUserReadingStats,
    getFullStats,
} from "./readService.js";

export async function handleGetReadChapters(req, res, next) {
    try {
        const { seriesId } = req.params;
        const ids = await getReadChapterIds(req.user.userId, seriesId);
        res.json(ids);
    } catch (error) {
        next(error);
    }
}

export const handleToggleChapterRead = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const chapterId = Number(req.params.chapterId);

        const result = await toggleChapterRead(userId, chapterId);

        return res.json(result);
    } catch (error) {
        next(error);
    }
};

export async function handleMarkChaptersUntil(req, res, next) {
    try {
        const { chapterId } = req.params;

        const result = await markChaptersUntil(req.user.userId, chapterId);

        res.json(result);
    } catch (error) {
        next(error);
    }
}

export async function handleGetReadingStats(req, res, next) {
    try {
        const stats = await getUserReadingStats(req.user.userId);
        res.json(stats);
    } catch (error) {
        next(error);
    }
}

export async function handleGetFullStats(req, res, next) {
    try {
        const stats = await getFullStats(req.user.userId);
        res.json(stats);
    } catch (error) {
        next(error);
    }
}
