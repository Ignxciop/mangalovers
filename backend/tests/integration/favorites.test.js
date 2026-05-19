import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { buildApp } from "../helpers/app.js";
import { prisma } from "../helpers/prisma.js";
import { createUser, createSeries } from "../helpers/factories.js";
import { generateAccessToken } from "../helpers/auth.js";

const app = buildApp();

async function auth(user) {
    return { Authorization: `Bearer ${generateAccessToken(user.id)}` };
}

describe("GET /api/favorites", () => {
    it("devuelve array vacío sin favoritos", async () => {
        const user = await createUser();
        const res = await request(app)
            .get("/api/favorites")
            .set(await auth(user))
            .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(0);
    });

    it("devuelve lista con favoritos", async () => {
        const user = await createUser();
        const series = await createSeries();

        await prisma.userFavorite.create({
            data: { userId: user.id, seriesId: series.id, status: "Siguiendo" },
        });

        const res = await request(app)
            .get("/api/favorites")
            .set(await auth(user))
            .expect(200);

        expect(res.body).toHaveLength(1);
        expect(res.body[0].series.name).toBe(series.name);
    });

    it("rechaza sin autenticación", async () => {
        const res = await request(app).get("/api/favorites").expect(401);
        expect(res.body.success).toBe(false);
    });
});

describe("GET /api/favorites/:seriesId", () => {
    it("devuelve favorito existente", async () => {
        const user = await createUser();
        const series = await createSeries();
        const fav = await prisma.userFavorite.create({
            data: { userId: user.id, seriesId: series.id, status: "Siguiendo" },
        });

        const res = await request(app)
            .get(`/api/favorites/${series.id}`)
            .set(await auth(user))
            .expect(200);

        expect(res.body).not.toBeNull();
        expect(res.body.id).toBe(fav.id);
    });

    it("devuelve null si no existe", async () => {
        const user = await createUser();
        const series = await createSeries();

        const res = await request(app)
            .get(`/api/favorites/${series.id}`)
            .set(await auth(user))
            .expect(200);

        expect(res.body).toBeNull();
    });
});

describe("POST /api/favorites", () => {
    it("crea un favorito", async () => {
        const user = await createUser();
        const series = await createSeries();

        const res = await request(app)
            .post("/api/favorites")
            .set(await auth(user))
            .send({ seriesId: series.id })
            .expect(200);

        expect(res.body.status).toBe("Siguiendo");
        expect(res.body.seriesId).toBe(series.id);
    });

    it("actualiza status existente (upsert)", async () => {
        const user = await createUser();
        const series = await createSeries();
        await prisma.userFavorite.create({
            data: { userId: user.id, seriesId: series.id, status: "Siguiendo" },
        });

        const res = await request(app)
            .post("/api/favorites")
            .set(await auth(user))
            .send({ seriesId: series.id, status: "Terminado" })
            .expect(200);

        expect(res.body.status).toBe("Terminado");
    });

    it("rechaza serie inexistente con 404", async () => {
        const user = await createUser();

        const res = await request(app)
            .post("/api/favorites")
            .set(await auth(user))
            .send({ seriesId: 99999 })
            .expect(404);

        expect(res.body.success).toBe(false);
    });

    it("rechaza status inválido con 400", async () => {
        const user = await createUser();
        const series = await createSeries();

        const res = await request(app)
            .post("/api/favorites")
            .set(await auth(user))
            .send({ seriesId: series.id, status: "Inexistente" })
            .expect(400);

        expect(res.body.success).toBe(false);
    });

    it("rechaza seriesId no entero con 400", async () => {
        const user = await createUser();

        const res = await request(app)
            .post("/api/favorites")
            .set(await auth(user))
            .send({ seriesId: "abc" })
            .expect(400);

        expect(res.body.success).toBe(false);
    });
});

describe("DELETE /api/favorites/:seriesId", () => {
    it("elimina un favorito", async () => {
        const user = await createUser();
        const series = await createSeries();
        await prisma.userFavorite.create({
            data: { userId: user.id, seriesId: series.id, status: "Siguiendo" },
        });

        const res = await request(app)
            .delete(`/api/favorites/${series.id}`)
            .set(await auth(user))
            .expect(200);

        expect(res.body.success).toBe(true);

        const fav = await prisma.userFavorite.findUnique({
            where: { userId_seriesId: { userId: user.id, seriesId: series.id } },
        });
        expect(fav).toBeNull();
    });
});

describe("límite de 200 favoritos", () => {
    it("rechaza al exceder el máximo", async () => {
        const user = await createUser();

        const batch = [];
        for (let i = 0; i < 200; i++) {
            const s = await createSeries({ name: `Limit Series ${i}` });
            batch.push(
                prisma.userFavorite.create({
                    data: { userId: user.id, seriesId: s.id, status: "Siguiendo" },
                }),
            );
        }
        await Promise.all(batch);

        const extra = await createSeries({ name: "Extra Series" });
        const res = await request(app)
            .post("/api/favorites")
            .set(await auth(user))
            .send({ seriesId: extra.id })
            .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/máximo|200|favoritos/i);
    });
});
