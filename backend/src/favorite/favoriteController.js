import {
    getUserFavorites,
    getFavorite,
    upsertFavorite,
    deleteFavorite,
} from "./favoriteService.js";

export async function handleGetFavorites(req, res, next) {
    try {
        const favorites = await getUserFavorites(req.user.userId);
        res.json(favorites);
    } catch (error) {
        next(error);
    }
}

export async function handleGetFavorite(req, res, next) {
    try {
        const favorite = await getFavorite(
            req.user.userId,
            req.params.seriesId,
        );
        res.json(favorite ?? null);
    } catch (error) {
        next(error);
    }
}

export async function handleUpsertFavorite(req, res, next) {
    try {
        const { seriesId, status = "Siguiendo" } = req.body;
        const favorite = await upsertFavorite(
            req.user.userId,
            seriesId,
            status,
        );
        res.json(favorite);
    } catch (error) {
        next(error);
    }
}

export async function handleDeleteFavorite(req, res, next) {
    try {
        await deleteFavorite(req.user.userId, req.params.seriesId);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
}
