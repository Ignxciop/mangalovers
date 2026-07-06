import {
  getAllManga, getLatestManga, getSeriesDetailBySlug,
  getChapterPages, getAllGenres, getRecommendedSeries,
} from "./mangaService.js";

export async function handleGetAllManga(req, res, next) {
  try {
    const userId = req.user?.userId ?? null;
    const result = await getAllManga(req.query, userId);
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
    const series = await getSeriesDetailBySlug(slug);
    res.json(series);
  } catch (error) {
    next(error);
  }
}

export async function handleGetChapterPages(req, res, next) {
  try {
    const { slug, chapterId } = req.params;
    const chapter = await getChapterPages(slug, chapterId);
    res.json(chapter);
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
