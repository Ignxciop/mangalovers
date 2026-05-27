import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../helpers/app.js";
import { createUser } from "../helpers/factories.js";
import { generateAccessToken } from "../helpers/auth.js";

const app = buildApp();

function authHeader(user) {
    return { Authorization: `Bearer ${generateAccessToken(user)}` };
}

describe("GET /api/admin/users", () => {
    it("devuelve lista de usuarios como ADMIN", async () => {
        const admin = await createUser({ role: "ADMIN" });
        await createUser({ name: "Alice", email: `alice-${Date.now()}@test.com"` });
        await createUser({ name: "Bob", email: `bob-${Date.now()}@test.com"` });

        const res = await request(app)
            .get("/api/admin/users")
            .set(authHeader(admin))
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(3);
        expect(res.body.meta.total).toBeGreaterThanOrEqual(3);
    });

    it("rechaza si no es ADMIN", async () => {
        const user = await createUser();
        const res = await request(app)
            .get("/api/admin/users")
            .set(authHeader(user))
            .expect(401);

        expect(res.body.success).toBe(false);
    });

    it("rechaza sin autenticación", async () => {
        const res = await request(app)
            .get("/api/admin/users")
            .expect(401);

        expect(res.body.success).toBe(false);
    });

    it("filtra por rol", async () => {
        const admin = await createUser({ role: "ADMIN" });
        await createUser({ name: "Normal", email: `normal-${Date.now()}@test.com"` });

        const res = await request(app)
            .get("/api/admin/users?role=ADMIN")
            .set(authHeader(admin))
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.every((u) => u.role === "ADMIN")).toBe(true);
    });

    it("busca por nombre", async () => {
        const admin = await createUser({ role: "ADMIN", name: "ZetaAdmin", email: `zeta-${Date.now()}@test.com"` });
        await createUser({ name: "JohnDoe", email: `john-${Date.now()}@test.com"` });

        const res = await request(app)
            .get("/api/admin/users?search=JohnDoe")
            .set(authHeader(admin))
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data[0].name).toBe("JohnDoe");
    });
});

describe("PATCH /api/admin/users/:id/role", () => {
    it("cambia rol de usuario como ADMIN", async () => {
        const admin = await createUser({ role: "ADMIN" });
        const target = await createUser();

        const res = await request(app)
            .patch(`/api/admin/users/${target.id}/role`)
            .set(authHeader(admin))
            .send({ role: "ADMIN" })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.role).toBe("ADMIN");
    });

    it("rechaza cambiar el propio rol", async () => {
        const admin = await createUser({ role: "ADMIN" });

        const res = await request(app)
            .patch(`/api/admin/users/${admin.id}/role`)
            .set(authHeader(admin))
            .send({ role: "USER" })
            .expect(400);
    });

    it("rechaza si no es ADMIN", async () => {
        const user = await createUser();
        const target = await createUser();

        const res = await request(app)
            .patch(`/api/admin/users/${target.id}/role`)
            .set(authHeader(user))
            .send({ role: "ADMIN" })
            .expect(401);

        expect(res.body.success).toBe(false);
    });

    it("rechaza rol inválido", async () => {
        const admin = await createUser({ role: "ADMIN" });

        const res = await request(app)
            .patch(`/api/admin/users/${admin.id}/role`)
            .set(authHeader(admin))
            .send({ role: "MODERATOR" })
            .expect(400);
    });
});

describe("GET /api/admin/metrics", () => {
    it("devuelve métricas como ADMIN", async () => {
        const admin = await createUser({ role: "ADMIN" });

        const res = await request(app)
            .get("/api/admin/metrics")
            .set(authHeader(admin))
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("users");
        expect(res.body.data).toHaveProperty("content");
        expect(res.body.data).toHaveProperty("suggestions");
        expect(res.body.data.users).toHaveProperty("total");
        expect(res.body.data.content).toHaveProperty("series");
        expect(res.body.data.suggestions).toHaveProperty("byStatus");
    });

    it("rechaza si no es ADMIN", async () => {
        const user = await createUser();

        const res = await request(app)
            .get("/api/admin/metrics")
            .set(authHeader(user))
            .expect(401);

        expect(res.body.success).toBe(false);
    });
});

describe("PATCH /api/admin/users/:id/status", () => {
    it("cambia estado de usuario como ADMIN", async () => {
        const admin = await createUser({ role: "ADMIN" });
        const target = await createUser();

        const res = await request(app)
            .patch(`/api/admin/users/${target.id}/status`)
            .set(authHeader(admin))
            .send({ status: "BANNED" })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("BANNED");
    });

    it("rechaza cambiar el propio estado", async () => {
        const admin = await createUser({ role: "ADMIN" });

        const res = await request(app)
            .patch(`/api/admin/users/${admin.id}/status`)
            .set(authHeader(admin))
            .send({ status: "BANNED" })
            .expect(400);

        expect(res.body.success).toBe(false);
    });

    it("rechaza estado inválido", async () => {
        const admin = await createUser({ role: "ADMIN" });
        const target = await createUser();

        const res = await request(app)
            .patch(`/api/admin/users/${target.id}/status`)
            .set(authHeader(admin))
            .send({ status: "INVALID_STATUS" })
            .expect(400);

        expect(res.body.success).toBe(false);
    });

    it("rechaza si no es ADMIN", async () => {
        const user = await createUser();
        const target = await createUser();

        const res = await request(app)
            .patch(`/api/admin/users/${target.id}/status`)
            .set(authHeader(user))
            .send({ status: "BANNED" })
            .expect(401);

        expect(res.body.success).toBe(false);
    });

    it("rechaza sin autenticación", async () => {
        const target = await createUser();

        const res = await request(app)
            .patch(`/api/admin/users/${target.id}/status`)
            .send({ status: "BANNED" })
            .expect(401);

        expect(res.body.success).toBe(false);
    });
});

describe("GET /api/admin/users/:id/activity", () => {
    it("devuelve activity logs de un usuario como ADMIN", async () => {
        const admin = await createUser({ role: "ADMIN" });
        const target = await createUser();

        const res = await request(app)
            .get(`/api/admin/users/${target.id}/activity`)
            .set(authHeader(admin))
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
        expect(res.body.meta).toHaveProperty("total");
    });

    it("rechaza si no es ADMIN", async () => {
        const user = await createUser();
        const target = await createUser();

        const res = await request(app)
            .get(`/api/admin/users/${target.id}/activity`)
            .set(authHeader(user))
            .expect(401);

        expect(res.body.success).toBe(false);
    });

    it("rechaza sin autenticación", async () => {
        const res = await request(app)
            .get("/api/admin/users/some-id/activity")
            .expect(401);

        expect(res.body.success).toBe(false);
    });
});

describe("GET /api/admin/logs", () => {
    it("devuelve todos los activity logs como ADMIN", async () => {
        const admin = await createUser({ role: "ADMIN" });

        const res = await request(app)
            .get("/api/admin/logs")
            .set(authHeader(admin))
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
        expect(res.body.meta).toHaveProperty("total");
    });

    it("rechaza si no es ADMIN", async () => {
        const user = await createUser();

        const res = await request(app)
            .get("/api/admin/logs")
            .set(authHeader(user))
            .expect(401);

        expect(res.body.success).toBe(false);
    });

    it("rechaza sin autenticación", async () => {
        const res = await request(app)
            .get("/api/admin/logs")
            .expect(401);

        expect(res.body.success).toBe(false);
    });
});
