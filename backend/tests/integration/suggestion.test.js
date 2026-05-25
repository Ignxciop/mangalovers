import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../helpers/app.js";
import { createUser } from "../helpers/factories.js";
import { generateAccessToken } from "../helpers/auth.js";

const app = buildApp();

function authHeader(user) {
    return { Authorization: `Bearer ${generateAccessToken(user)}` };
}

describe("POST /api/suggestions", () => {
    it("crea una sugerencia como USER", async () => {
        const user = await createUser();
        const res = await request(app)
            .post("/api/suggestions")
            .set(authHeader(user))
            .send({ type: "BUG", title: "Error al cargar", description: "No carga el capítulo 5" })
            .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data.type).toBe("BUG");
        expect(res.body.data.status).toBe("OPEN");
    });

    it("rechaza sin autenticación", async () => {
        const res = await request(app)
            .post("/api/suggestions")
            .send({ type: "BUG", title: "Test", description: "Test" })
            .expect(401);
    });

    it("rechaza tipo inválido", async () => {
        const user = await createUser();
        const res = await request(app)
            .post("/api/suggestions")
            .set(authHeader(user))
            .send({ type: "INVALID", title: "Test", description: "Test" })
            .expect(400);
    });

    it("rechaza título vacío", async () => {
        const user = await createUser();
        const res = await request(app)
            .post("/api/suggestions")
            .set(authHeader(user))
            .send({ type: "BUG", title: "", description: "Test" })
            .expect(400);
    });
});

describe("GET /api/suggestions/mine", () => {
    it("devuelve sugerencias del usuario", async () => {
        const user = await createUser();
        await request(app)
            .post("/api/suggestions")
            .set(authHeader(user))
            .send({ type: "SUGGESTION", title: "Mejora UX", description: "Agregar modo oscuro" });

        const res = await request(app)
            .get("/api/suggestions/mine")
            .set(authHeader(user))
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].title).toBe("Mejora UX");
    });
});

describe("GET /api/suggestions (admin)", () => {
    it("devuelve todas las sugerencias como ADMIN", async () => {
        const admin = await createUser({ role: "ADMIN" });
        const user = await createUser();
        await request(app)
            .post("/api/suggestions")
            .set(authHeader(user))
            .send({ type: "BUG", title: "Bug test", description: "Descripción" });

        const res = await request(app)
            .get("/api/suggestions")
            .set(authHeader(admin))
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("rechaza si no es ADMIN", async () => {
        const user = await createUser();
        const res = await request(app)
            .get("/api/suggestions")
            .set(authHeader(user))
            .expect(401);

        expect(res.body.success).toBe(false);
    });
});

describe("PATCH /api/suggestions/:id/status (admin)", () => {
    it("cambia estado como ADMIN", async () => {
        const admin = await createUser({ role: "ADMIN" });
        const user = await createUser();
        const sug = await request(app)
            .post("/api/suggestions")
            .set(authHeader(user))
            .send({ type: "BUG", title: "Bug", description: "Desc" });

        const res = await request(app)
            .patch(`/api/suggestions/${sug.body.data.id}/status`)
            .set(authHeader(admin))
            .send({ status: "REVIEWING" })
            .expect(200);

        expect(res.body.data.status).toBe("REVIEWING");
    });

    it("rechaza cambio de estado si no es ADMIN", async () => {
        const user = await createUser();
        const sug = await request(app)
            .post("/api/suggestions")
            .set(authHeader(user))
            .send({ type: "BUG", title: "Bug", description: "Desc" });

        const res = await request(app)
            .patch(`/api/suggestions/${sug.body.data.id}/status`)
            .set(authHeader(user))
            .send({ status: "RESOLVED" })
            .expect(401);
    });
});
