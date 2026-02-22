import {
    getUserFavorites,
    getFavorite,
    upsertFavorite,
    deleteFavorite,
} from "./favoriteService.js";

export async function handleGetFavorites(req, res) {
    try {
        const favorites = await getUserFavorites(req.user.userId);
        res.json(favorites);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
}

export async function handleGetFavorite(req, res) {
    try {
        const favorite = await getFavorite(
            req.user.userId,
            req.params.seriesId,
        );
        res.json(favorite ?? null);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
}

export async function handleUpsertFavorite(req, res) {
    try {
        const { seriesId, status = "Siguiendo" } = req.body;
        const favorite = await upsertFavorite(
            req.user.userId,
            seriesId,
            status,
        );
        res.json(favorite);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
}

export async function handleDeleteFavorite(req, res) {
    try {
        await deleteFavorite(req.user.userId, req.params.seriesId);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
}
