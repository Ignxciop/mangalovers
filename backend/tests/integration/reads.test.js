import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { buildApp } from "../helpers/app.js";
import { prisma } from "../helpers/prisma.js";
import { createUser, createSeries, createChapter, createGenre } from "../helpers/factories.js";
import { generateAccessToken } from "../helpers/auth.js";

const app = buildApp();

async function auth(user) {
    return { Authorization: `Bearer ${generateAccessToken(user.id)}` };
}

describe("GET /api/reads/series/:seriesId", () => {
    it("devuelve array vacío si no hay capítulos leídos", async () => {
        const user = await createUser();
        const series = await createSeries();
        await createChapter(series.id);

        const res = await request(app)
            .get(`/api/reads/series/${series.id}`)
            .set(await auth(user))
            .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(0);
    });

    it("devuelve IDs de capítulos leídos", async () => {
        const user = await createUser();
        const series = await createSeries();
        const ch1 = await createChapter(series.id, { name: "1" });
        const ch2 = await createChapter(series.id, { name: "2" });

        await prisma.userChapterRead.createMany({
            data: [
                { userId: user.id, chapterId: ch1.id },
                { userId: user.id, chapterId: ch2.id },
            ],
        });

        const res = await request(app)
            .get(`/api/reads/series/${series.id}`)
            .set(await auth(user))
            .expect(200);

        expect(res.body).toEqual(expect.arrayContaining([ch1.id, ch2.id]));
    });

    it("rechaza serie inexistente con 404", async () => {
        const user = await createUser();

        const res = await request(app)
            .get("/api/reads/series/99999")
            .set(await auth(user))
            .expect(404);

        expect(res.body.success).toBe(false);
    });
});

describe("POST /api/reads/chapter/:chapterId/toggle", () => {
    it("marca capítulos hasta el indicado si no existe", async () => {
        const user = await createUser();
        const series = await createSeries();
        const ch1 = await createChapter(series.id, { name: "1" });
        const ch2 = await createChapter(series.id, { name: "2" });
        const ch3 = await createChapter(series.id, { name: "3" });

        const res = await request(app)
            .post(`/api/reads/chapter/${ch2.id}/toggle`)
            .set(await auth(user))
            .expect(200);

        expect(res.body.updated).toBe(2);

        const reads = await prisma.userChapterRead.findMany({
            where: { userId: user.id },
            select: { chapterId: true },
        });
        const ids = reads.map((r) => r.chapterId);
        expect(ids).toContain(ch1.id);
        expect(ids).toContain(ch2.id);
        expect(ids).not.toContain(ch3.id);
    });

    it("desmarca capítulos desde el indicado si ya existe (toggle off)", async () => {
        const user = await createUser();
        const series = await createSeries();
        const ch1 = await createChapter(series.id, { name: "1" });
        const ch2 = await createChapter(series.id, { name: "2" });
        const ch3 = await createChapter(series.id, { name: "3" });

        await prisma.userChapterRead.createMany({
            data: [
                { userId: user.id, chapterId: ch1.id },
                { userId: user.id, chapterId: ch2.id },
                { userId: user.id, chapterId: ch3.id },
            ],
        });

        const res = await request(app)
            .post(`/api/reads/chapter/${ch2.id}/toggle`)
            .set(await auth(user))
            .expect(200);

        expect(res.body.updated).toBe(2);

        const reads = await prisma.userChapterRead.findMany({
            where: { userId: user.id },
            select: { chapterId: true },
        });
        const ids = reads.map((r) => r.chapterId);
        expect(ids).not.toContain(ch2.id);
        expect(ids).not.toContain(ch3.id);
        expect(ids).toContain(ch1.id);
    });
});

describe("POST /api/reads/chapter/:chapterId/mark-until", () => {
    it("marca todos los capítulos hasta el indicado", async () => {
        const user = await createUser();
        const series = await createSeries();
        const ch1 = await createChapter(series.id, { name: "1" });
        const ch2 = await createChapter(series.id, { name: "2" });
        const ch3 = await createChapter(series.id, { name: "3" });

        const res = await request(app)
            .post(`/api/reads/chapter/${ch3.id}/mark-until`)
            .set(await auth(user))
            .expect(200);

        expect(res.body.updated).toBe(3);

        const count = await prisma.userChapterRead.count({
            where: { userId: user.id },
        });
        expect(count).toBe(3);
    });
});

describe("GET /api/reads/stats", () => {
    it("devuelve stats vacías sin datos", async () => {
        const user = await createUser();

        const res = await request(app)
            .get("/api/reads/stats")
            .set(await auth(user))
            .expect(200);

        expect(res.body.totalChaptersRead).toBe(0);
        expect(res.body.totalSeries).toBe(0);
        expect(res.body.completionPercent).toBe(0);
        expect(Array.isArray(res.body.continueReading)).toBe(true);
    });

    it("devuelve stats con datos de lectura", async () => {
        const user = await createUser();
        const series = await createSeries();
        const ch1 = await createChapter(series.id, { name: "1" });
        const ch2 = await createChapter(series.id, { name: "2" });
        const ch3 = await createChapter(series.id, { name: "3" });

        await prisma.userFavorite.create({
            data: { userId: user.id, seriesId: series.id, status: "Siguiendo" },
        });
        await prisma.userChapterRead.createMany({
            data: [
                { userId: user.id, chapterId: ch1.id },
                { userId: user.id, chapterId: ch2.id },
            ],
        });

        const res = await request(app)
            .get("/api/reads/stats")
            .set(await auth(user))
            .expect(200);

        expect(res.body.totalChaptersRead).toBe(2);
        expect(res.body.totalSeries).toBe(1);
        expect(res.body.continueReading).toHaveLength(1);
        expect(res.body.continueReading[0].id).toBe(series.id);
        expect(res.body.continueReading[0].chaptersLeft).toBe(1);
    });
});

describe("PUT /api/reads/chapter/:chapterId/progress", () => {
    it("guarda progreso con pageNumber", async () => {
        const user = await createUser();
        const series = await createSeries();
        const chapter = await createChapter(series.id);

        const res = await request(app)
            .put(`/api/reads/chapter/${chapter.id}/progress`)
            .set(await auth(user))
            .send({ pageNumber: 5 })
            .expect(200);

        expect(res.body.pageNumber).toBe(5);
    });

    it("guarda progreso con percentage", async () => {
        const user = await createUser();
        const series = await createSeries();
        const chapter = await createChapter(series.id);

        const res = await request(app)
            .put(`/api/reads/chapter/${chapter.id}/progress`)
            .set(await auth(user))
            .send({ percentage: 50 })
            .expect(200);

        expect(res.body.percentage).toBe(50);
    });

    it("actualiza progreso existente", async () => {
        const user = await createUser();
        const series = await createSeries();
        const chapter = await createChapter(series.id);

        await request(app)
            .put(`/api/reads/chapter/${chapter.id}/progress`)
            .set(await auth(user))
            .send({ pageNumber: 3 });

        const res = await request(app)
            .put(`/api/reads/chapter/${chapter.id}/progress`)
            .set(await auth(user))
            .send({ pageNumber: 10 })
            .expect(200);

        expect(res.body.pageNumber).toBe(10);
    });

    it("rechaza capítulo inexistente con 404", async () => {
        const user = await createUser();

        const res = await request(app)
            .put("/api/reads/chapter/99999/progress")
            .set(await auth(user))
            .send({ pageNumber: 1 })
            .expect(404);

        expect(res.body.message).toMatch(/not found/i);
    });
});

describe("GET /api/reads/chapter/:chapterId/progress", () => {
    it("devuelve null si no hay progreso", async () => {
        const user = await createUser();
        const series = await createSeries();
        const chapter = await createChapter(series.id);

        const res = await request(app)
            .get(`/api/reads/chapter/${chapter.id}/progress`)
            .set(await auth(user))
            .expect(200);

        expect(res.body).toBeNull();
    });

    it("devuelve el progreso guardado", async () => {
        const user = await createUser();
        const series = await createSeries();
        const chapter = await createChapter(series.id);

        await request(app)
            .put(`/api/reads/chapter/${chapter.id}/progress`)
            .set(await auth(user))
            .send({ pageNumber: 7, percentage: 35 });

        const res = await request(app)
            .get(`/api/reads/chapter/${chapter.id}/progress`)
            .set(await auth(user))
            .expect(200);

        expect(res.body.pageNumber).toBe(7);
        expect(res.body.percentage).toBe(35);
    });
});

describe("GET /api/reads/series/:seriesId/progress", () => {
    it("devuelve array vacío si no hay progreso", async () => {
        const user = await createUser();
        const series = await createSeries();
        await createChapter(series.id);

        const res = await request(app)
            .get(`/api/reads/series/${series.id}/progress`)
            .set(await auth(user))
            .expect(200);

        expect(res.body).toEqual([]);
    });

    it("devuelve progresos de todos los capítulos de la serie", async () => {
        const user = await createUser();
        const series = await createSeries();
        const ch1 = await createChapter(series.id, { name: "1" });
        const ch2 = await createChapter(series.id, { name: "2" });

        await request(app)
            .put(`/api/reads/chapter/${ch1.id}/progress`)
            .set(await auth(user))
            .send({ pageNumber: 5 });
        await request(app)
            .put(`/api/reads/chapter/${ch2.id}/progress`)
            .set(await auth(user))
            .send({ pageNumber: 10 });

        const res = await request(app)
            .get(`/api/reads/series/${series.id}/progress`)
            .set(await auth(user))
            .expect(200);

        expect(res.body).toHaveLength(2);
        const ids = res.body.map((p) => p.chapterId);
        expect(ids).toContain(ch1.id);
        expect(ids).toContain(ch2.id);
    });
});

describe("GET /api/reads/full-stats", () => {
    it("devuelve estadísticas completas", async () => {
        const user = await createUser();
        const series = await createSeries();
        const genre = await createGenre("Acción");
        await prisma.seriesGenre.create({
            data: { seriesId: series.id, genreId: genre.id },
        });
        const ch1 = await createChapter(series.id, { name: "1" });

        await prisma.userFavorite.create({
            data: { userId: user.id, seriesId: series.id, status: "Siguiendo" },
        });
        await prisma.userChapterRead.create({
            data: { userId: user.id, chapterId: ch1.id },
        });

        const res = await request(app)
            .get("/api/reads/full-stats")
            .set(await auth(user))
            .expect(200);

        expect(res.body.totalChaptersRead).toBe(1);
        expect(res.body.topGenres).toBeDefined();
        expect(res.body.activityByDay).toHaveLength(7);
        expect(res.body.topSeries).toHaveLength(1);
        expect(res.body.avgChaptersPerDay).toBe(1);
    });
});
