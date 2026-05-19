import {
    getAllManga,
    getLatestManga,
    getSeriesDetailBySlug,
    getChapterPages,
    getAllGenres,
    getRecommendedSeries,
} from "./mangaService.js";
import { markChaptersUntil } from "../read/readService.js";

export async function handleGetAllManga(req, res, next) {
    try {
        const result = await getAllManga(req.query);
        res.json(result);
    } catch (error) {
        next(error);
    }
}

export async function handleGetAllGenres(req, res, next) {
    try {
        const genres = await getAllGenres();
        res.json(genres);
    } catch (error) {
        next(error);
    }
}

export async function handleGetLatestManga(req, res, next) {
    try {
        const limit = Number(req.query.limit) || 16;
        const userId = req.user?.userId ?? null;
        const manga = await getLatestManga(userId, limit);
        res.json(manga);
    } catch (error) {
        next(error);
    }
}

export async function getSeriesDetail(req, res, next) {
    try {
        const { slug } = req.params;

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 100;
        const series = await getSeriesDetailBySlug(slug, page, Math.min(limit, 200));

        if (!series) {
            return res.status(404).json({
                success: false,
                message: "Serie no encontrada",
            });
        }

        return res.json(series);
    } catch (error) {
        next(error);
    }
}

export async function handleGetChapterPages(req, res, next) {
    try {
        const { slug, chapterId } = req.params;
        if (isNaN(Number(chapterId))) {
            return res.status(400).json({
                success: false,
                message: "ID de capítulo inválido",
            });
        }
        if (!slug) {
            return res.status(400).json({
                success: false,
                message: "Slug de serie requerido",
            });
        }

        const userId = req.user?.userId ?? null;
        const chapter = await getChapterPages(
            slug,
            chapterId,
            userId,
        );

        if (!chapter) {
            return res.status(404).json({
                success: false,
                message: "Capítulo no encontrado",
            });
        }

        if (userId) {
            await markChaptersUntil(userId, chapterId).catch(() => {});
        }

        return res.json(chapter);
    } catch (error) {
        next(error);
    }
}

export async function handleGetRecommended(req, res, next) {
    try {
        if (!req.user?.userId) return res.json({ series: [], basedOn: [] });
        const result = await getRecommendedSeries(req.user.userId);
        res.json(result);
    } catch (error) {
        next(error);
    }
}
