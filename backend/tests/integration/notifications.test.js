import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../helpers/app.js";
import { createUser } from "../helpers/factories.js";
import { generateAccessToken } from "../helpers/auth.js";

const app = buildApp();

describe("GET /api/notifications/vapid-public-key", () => {
    it("devuelve la clave pública VAPID", async () => {
        const res = await request(app)
            .get("/api/notifications/vapid-public-key")
            .expect(200);

        expect(res.body.publicKey).toBeDefined();
        expect(typeof res.body.publicKey).toBe("string");
    });
});

describe("POST /api/notifications/subscribe", () => {
    it("registra una suscripción", async () => {
        const user = await createUser();
        const token = generateAccessToken(user.id);

        const res = await request(app)
            .post("/api/notifications/subscribe")
            .set("Authorization", `Bearer ${token}`)
            .send({
                endpoint: "https://example.com/push/abc123",
                keys: { p256dh: "base64key1", auth: "base64auth1" },
            })
            .expect(201);

        expect(res.body.ok).toBe(true);
        expect(res.body.id).toBeDefined();
    });

    it("rechaza sin endpoint con 400", async () => {
        const user = await createUser();
        const token = generateAccessToken(user.id);

        const res = await request(app)
            .post("/api/notifications/subscribe")
            .set("Authorization", `Bearer ${token}`)
            .send({ keys: { p256dh: "x", auth: "y" } })
            .expect(400);

        expect(res.body.success).toBe(false);
    });

    it("rechaza sin autenticación", async () => {
        const res = await request(app)
            .post("/api/notifications/subscribe")
            .send({ endpoint: "x", keys: { p256dh: "x", auth: "y" } })
            .expect(401);
    });
});

describe("DELETE /api/notifications/unsubscribe", () => {
    it("elimina una suscripción", async () => {
        const user = await createUser();
        const token = generateAccessToken(user.id);

        await request(app)
            .post("/api/notifications/subscribe")
            .set("Authorization", `Bearer ${token}`)
            .send({
                endpoint: "https://example.com/push/to-delete",
                keys: { p256dh: "k", auth: "a" },
            });

        const res = await request(app)
            .delete("/api/notifications/unsubscribe")
            .set("Authorization", `Bearer ${token}`)
            .send({ endpoint: "https://example.com/push/to-delete" })
            .expect(200);

        expect(res.body.ok).toBe(true);
    });
});

describe("GET /api/notifications/status", () => {
    it("devuelve subscribed=true si existe", async () => {
        const user = await createUser();
        const token = generateAccessToken(user.id);

        await request(app)
            .post("/api/notifications/subscribe")
            .set("Authorization", `Bearer ${token}`)
            .send({
                endpoint: "https://example.com/push/status-test",
                keys: { p256dh: "k", auth: "a" },
            });

        const res = await request(app)
            .get("/api/notifications/status?endpoint=https://example.com/push/status-test")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        expect(res.body.subscribed).toBe(true);
    });

    it("devuelve subscribed=false si no existe", async () => {
        const user = await createUser();
        const token = generateAccessToken(user.id);

        const res = await request(app)
            .get("/api/notifications/status?endpoint=https://example.com/push/nonexistent")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        expect(res.body.subscribed).toBe(false);
    });
});
