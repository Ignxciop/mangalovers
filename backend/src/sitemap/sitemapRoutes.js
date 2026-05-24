import { Router } from "express";
import { handleSitemap } from "./sitemapController.js";

const router = Router();

router.get("/sitemap.xml", handleSitemap);

export default router;
