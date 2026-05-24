import { getAllSitemapData } from "./sitemapService.js";

const SITE_URL = process.env.FRONTEND_URL || "https://mangalovers.josenunez.cl";

function xmlDate(date) {
    return date instanceof Date ? date.toISOString().split(".")[0] + "+00:00" : "";
}

function buildXml({ series, chapters }) {
    let urls = "";

    const staticPages = [
        { loc: "/", priority: "1.0", changefreq: "daily" },
        { loc: "/mangas", priority: "0.9", changefreq: "daily" },
        { loc: "/terminos", priority: "0.3", changefreq: "monthly" },
        { loc: "/privacidad", priority: "0.3", changefreq: "monthly" },
    ];

    for (const page of staticPages) {
        urls += `  <url>\n    <loc>${SITE_URL}${page.loc}</loc>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>\n`;
    }

    for (const s of series) {
        const lastmod = xmlDate(s.lastChapterPublishedAt ?? s.updatedAt);
        urls += `  <url>\n    <loc>${SITE_URL}/manga/${s.slug}</loc>\n`;
        if (lastmod) urls += `    <lastmod>${lastmod}</lastmod>\n`;
        urls += `    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    }

    for (const ch of chapters) {
        urls += `  <url>\n    <loc>${SITE_URL}/manga/${ch.series.slug}/capitulo/${ch.id}</loc>\n`;
        urls += `    <lastmod>${xmlDate(ch.publishedAt)}</lastmod>\n`;
        urls += `    <changefreq>weekly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>`;
}

export async function handleSitemap(req, res, next) {
    try {
        const data = await getAllSitemapData();
        const xml = buildXml(data);
        res.set("Content-Type", "application/xml");
        res.set("Cache-Control", "public, max-age=3600");
        res.send(xml);
    } catch (error) {
        next(error);
    }
}
