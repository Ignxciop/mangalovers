import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../helpers/app.js";
import { prisma } from "../helpers/prisma.js";
import { createUser, createSeries, createChapter, createGenre, createProvider } from "../helpers/factories.js";
import { generateAccessToken } from "../helpers/auth.js";

const app = buildApp();

describe("GET /api/manga", () => {
    it("devuelve lista paginada vacía", async () => {
        const res = await request(app).get("/api/manga").expect(200);

        expect(res.body.data).toEqual([]);
        expect(res.body.meta.total).toBe(0);
        expect(res.body.meta.page).toBe(1);
    });

    it("devuelve series con estructura correcta", async () => {
        const series = await createSeries({
            name: "One Piece",
            chapterCount: 5,
            lastChapterPublishedAt: new Date(),
        });

        const res = await request(app).get("/api/manga").expect(200);

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].name).toBe("One Piece");
        expect(res.body.data[0].slug).toBe(series.slug);
        expect(res.body.data[0].providers).toBeDefined();
        expect(res.body.meta.total).toBe(1);
    });

    it("filtra por search", async () => {
        await createSeries({ name: "Naruto", slug: "naruto", lastChapterPublishedAt: new Date() });
        await createSeries({ name: "Bleach", slug: "bleach", lastChapterPublishedAt: new Date() });

        const res = await request(app).get("/api/manga?search=naruto").expect(200);

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].name).toBe("Naruto");
    });

    it("filtra por status", async () => {
        await createSeries({ name: "Ongoing", slug: "ongoing", status: "En emisión", lastChapterPublishedAt: new Date() });
        await createSeries({ name: "Finished", slug: "finished", status: "Finalizado", lastChapterPublishedAt: new Date() });

        const res = await request(app).get("/api/manga?status=Finalizado").expect(200);

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].name).toBe("Finished");
    });

    it("filtra por type", async () => {
        await createSeries({ name: "Manga", slug: "manga-type", type: "Manga" });
        await createSeries({ name: "Manhwa", slug: "manhwa-type", type: "Manhwa", lastChapterPublishedAt: new Date() });

        const res = await request(app).get("/api/manga?type=Manhwa").expect(200);

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].name).toBe("Manhwa");
    });

    it("filtra por provider", async () => {
        const provider = await createProvider("olympus");
        const series = await createSeries({
            name: "Provider Series",
            slug: "provider-test",
            lastChapterPublishedAt: new Date(),
        });
        await prisma.providerSeries.create({
            data: { providerId: provider.id, seriesId: series.id, externalId: "ext-1", slug: "ext-slug" },
        });

        const res = await request(app).get("/api/manga?provider=olympus").expect(200);

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].providers).toContain("olympus");
    });

    it("filtra por géneros", async () => {
        const action = await createGenre("Acción");
        const comedy = await createGenre("Comedia");
        const s1 = await createSeries({ name: "Action Only", slug: "action-only", lastChapterPublishedAt: new Date() });
        const s2 = await createSeries({ name: "Comedy Only", slug: "comedy-only", lastChapterPublishedAt: new Date() });
        await prisma.seriesGenre.create({ data: { seriesId: s1.id, genreId: action.id } });
        await prisma.seriesGenre.create({ data: { seriesId: s2.id, genreId: comedy.id } });

        const res = await request(app).get("/api/manga?genres=Acción").expect(200);

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].name).toBe("Action Only");
    });

    it("excluye géneros", async () => {
        const action = await createGenre("Acción");
        const comedy = await createGenre("Comedia");
        const s1 = await createSeries({ name: "Action Only", slug: "action-only-2", lastChapterPublishedAt: new Date() });
        const s2 = await createSeries({ name: "Comedy Only", slug: "comedy-only-2", lastChapterPublishedAt: new Date() });
        await prisma.seriesGenre.create({ data: { seriesId: s1.id, genreId: action.id } });
        await prisma.seriesGenre.create({ data: { seriesId: s2.id, genreId: comedy.id } });

        const res = await request(app).get("/api/manga?excludeGenres=Comedia").expect(200);

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].name).toBe("Action Only");
    });

    it("combina géneros incluidos y excluidos", async () => {
        const action = await createGenre("Acción");
        const romance = await createGenre("Romance");
        const actionRomance = await createSeries({ name: "Action Romance", slug: "action-romance", lastChapterPublishedAt: new Date() });
        const actionOnly = await createSeries({ name: "Action Only", slug: "action-only-3", lastChapterPublishedAt: new Date() });
        await prisma.seriesGenre.create({ data: { seriesId: actionRomance.id, genreId: action.id } });
        await prisma.seriesGenre.create({ data: { seriesId: actionRomance.id, genreId: romance.id } });
        await prisma.seriesGenre.create({ data: { seriesId: actionOnly.id, genreId: action.id } });

        const res = await request(app).get("/api/manga?genres=Acción&excludeGenres=Romance").expect(200);

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].name).toBe("Action Only");
    });

    it("ordena por chapters asc", async () => {
        await createSeries({ name: "Few", slug: "few", chapterCount: 1, lastChapterPublishedAt: new Date() });
        await createSeries({ name: "Many", slug: "many", chapterCount: 10, lastChapterPublishedAt: new Date() });

        const res = await request(app).get("/api/manga?sort=chapters&order=asc").expect(200);

        expect(res.body.data[0].chapterCount).toBe(1);
        expect(res.body.data[1].chapterCount).toBe(10);
    });

    it("pagina resultados", async () => {
        for (let i = 0; i < 5; i++) {
            await createSeries({ name: `Page Series ${i}`, slug: `page-${i}`, lastChapterPublishedAt: new Date() });
        }

        const res = await request(app).get("/api/manga?page=1&limit=2&sort=az").expect(200);

        expect(res.body.data).toHaveLength(2);
        expect(res.body.meta.totalPages).toBe(3);
        expect(res.body.meta.page).toBe(1);
    });
});

describe("GET /api/manga/latest", () => {
    it("devuelve últimos capítulos publicados", async () => {
        await createSeries({
            name: "Recent",
            slug: "recent",
            lastChapterPublishedAt: new Date(),
        });
        await createSeries({
            name: "Old",
            slug: "old",
            lastChapterPublishedAt: null,
        });

        const res = await request(app).get("/api/manga/latest").expect(200);

        expect(res.body).toHaveLength(1);
        expect(res.body[0].name).toBe("Recent");
    });

    it("respeta el límite", async () => {
        for (let i = 0; i < 3; i++) {
            await createSeries({
                name: `Latest ${i}`,
                slug: `latest-${i}`,
                lastChapterPublishedAt: new Date(),
            });
        }

        const res = await request(app).get("/api/manga/latest?limit=2").expect(200);

        expect(res.body).toHaveLength(2);
    });
});

describe("GET /api/manga/genres", () => {
    it("devuelve todos los géneros ordenados", async () => {
        await createGenre("Zombies");
        await createGenre("Acción");

        const res = await request(app).get("/api/manga/genres").expect(200);

        expect(res.body).toHaveLength(2);
        expect(res.body[0].name).toBe("Acción");
        expect(res.body[1].name).toBe("Zombies");
    });

    it("devuelve array vacío sin géneros", async () => {
        const res = await request(app).get("/api/manga/genres").expect(200);
        expect(res.body).toEqual([]);
    });
});

describe("GET /api/manga/recommended", () => {
    it("devuelve array vacío sin auth", async () => {
        const res = await request(app).get("/api/manga/recommended").expect(200);
        expect(res.body.series).toEqual([]);
    });

    it("devuelve recomendaciones basadas en series leídas", async () => {
        const user = await createUser();
        const action = await createGenre("Acción");

        const favSeries = await createSeries({ name: "Fav", slug: "fav-series", chapterCount: 1 });
        await prisma.seriesGenre.create({ data: { seriesId: favSeries.id, genreId: action.id } });
        await prisma.userFavorite.create({
            data: { userId: user.id, seriesId: favSeries.id, status: "Siguiendo" },
        });
        const readCh = await createChapter(favSeries.id, { name: "1" });
        await prisma.userChapterRead.create({
            data: { userId: user.id, chapterId: readCh.id },
        });

        const recommended = await createSeries({ name: "Recommended", slug: "rec-series" });
        await prisma.seriesGenre.create({ data: { seriesId: recommended.id, genreId: action.id } });

        await createSeries({ name: "Non Match", slug: "non-match" });

        const token = generateAccessToken(user.id);
        const res = await request(app)
            .get("/api/manga/recommended")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        expect(res.body.basedOn).toEqual(["Acción"]);
        const names = res.body.series.map((s) => s.name);
        expect(names).toContain("Recommended");
        expect(names).not.toContain("Fav");
        expect(names).not.toContain("Non Match");
    });
});

describe("GET /api/manga/:slug", () => {
    it("devuelve detalle de serie", async () => {
        const action = await createGenre("Acción");
        const series = await createSeries({
            name: "Detail Series",
            summary: "A summary",
            chapterCount: 2,
        });
        await prisma.seriesGenre.create({ data: { seriesId: series.id, genreId: action.id } });
        await createChapter(series.id, { name: "1" });
        await createChapter(series.id, { name: "2" });

        const res = await request(app)
            .get(`/api/manga/${series.slug}`)
            .expect(200);

        expect(res.body.name).toBe("Detail Series");
        expect(res.body.summary).toBe("A summary");
        expect(res.body.genres).toContain("Acción");
        expect(res.body.chapters).toHaveLength(2);
    });

    it("devuelve 404 para slug inexistente", async () => {
        const res = await request(app)
            .get("/api/manga/slug-inexistente")
            .expect(404);

        expect(res.body.success).toBe(false);
    });
});

describe("GET /api/manga/capitulo/:slug/:chapterId/pages", () => {
    it("devuelve páginas del capítulo", async () => {
        const series = await createSeries({ name: "Pages Test", slug: "pages-test" });
        const chapter = await createChapter(series.id, { name: "5" });
        await prisma.page.create({
            data: { chapterId: chapter.id, url: "https://example.com/page1.jpg" },
        });
        await prisma.page.create({
            data: { chapterId: chapter.id, url: "https://example.com/page2.jpg" },
        });

        const res = await request(app)
            .get(`/api/manga/capitulo/${series.slug}/${chapter.id}/pages`)
            .expect(200);

        expect(res.body.chapterId).toBe(chapter.id);
        expect(res.body.name).toBe("5");
        expect(res.body.pages).toHaveLength(2);
        expect(res.body.pages[0].url).toContain("page1.jpg");
    });

    it("devuelve 404 para capítulo inexistente", async () => {
        const series = await createSeries({ name: "No Chapter", slug: "no-chapter" });

        const res = await request(app)
            .get(`/api/manga/capitulo/${series.slug}/99999/pages`)
            .expect(404);

        expect(res.body.success).toBe(false);
    });

    it("navega prev/next entre capítulos", async () => {
        const series = await createSeries({ name: "Nav Test", slug: "nav-test" });
        const ch1 = await createChapter(series.id, { name: "1" });
        const ch2 = await createChapter(series.id, { name: "2" });

        const res = await request(app)
            .get(`/api/manga/capitulo/${series.slug}/${ch2.id}/pages`)
            .expect(200);

        expect(res.body.prev.id).toBe(ch1.id);
        expect(res.body.next).toBeNull();
    });
});
