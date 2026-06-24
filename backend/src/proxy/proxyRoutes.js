import { Router } from "express";
import { fetchProxiedImage } from "./imageProxy.js";
import logger from "../config/logger.js";

const router = Router();

router.get("/proxy/image", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ success: false, message: "url requerida" });
  }

  try {
    const upstream = await fetchProxiedImage(url);
    const contentType =
      upstream.headers["content-type"] || "image/jpeg";

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=86400");
    res.set("X-Proxy", "mangalovers");

    upstream.data.pipe(res);
  } catch (err) {
    logger.warn({ url, err: err.message }, "Error proxying image");
    res.status(502).json({ success: false, message: "Error al obtener imagen" });
  }
});

export default router;
