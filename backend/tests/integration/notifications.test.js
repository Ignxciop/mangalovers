import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../helpers/app.js";
import { prisma } from "../helpers/prisma.js";
import { createUser } from "../helpers/factories.js";
import { generateAccessToken } from "../helpers/auth.js";

const app = buildApp();

describe("GET /api/notifications/vapid-public-key", () => {
  it("devuelve la clave pública VAPID", async () => {
    const res = await request(app)
      .get("/api/notifications/vapid-public-key")
      .expect(200);

    expect(res.body.data.publicKey).toBeDefined();
    expect(typeof res.body.data.publicKey).toBe("string");
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

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
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

    expect(res.body.success).toBe(true);
  });
});

async function createNotification(userId) {
    return prisma.notification.create({
        data: {
            userId,
            type: "FRIEND_REQUEST",
            title: "Solicitud de amistad",
            body: "Tienes una nueva solicitud",
        },
    });
}

describe("GET /api/notifications", () => {
    it("devuelve lista vacía sin notificaciones", async () => {
        const user = await createUser();
        const token = generateAccessToken(user.id);

        const res = await request(app)
            .get("/api/notifications")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual([]);
        expect(res.body.total).toBe(0);
    });

    it("devuelve notificaciones del usuario", async () => {
        const user = await createUser();
        const token = generateAccessToken(user.id);
        await createNotification(user.id);

        const res = await request(app)
            .get("/api/notifications")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].title).toBe("Solicitud de amistad");
        expect(res.body.total).toBe(1);
    });

    it("no devuelve notificaciones de otros usuarios", async () => {
        const user1 = await createUser();
        const user2 = await createUser();
        const token = generateAccessToken(user1.id);
        await createNotification(user2.id);

        const res = await request(app)
            .get("/api/notifications")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        expect(res.body.data).toEqual([]);
        expect(res.body.total).toBe(0);
    });

    it("rechaza sin autenticación", async () => {
        const res = await request(app)
            .get("/api/notifications")
            .expect(401);

        expect(res.body.success).toBe(false);
    });
});

describe("GET /api/notifications/unread-count", () => {
    it("devuelve 0 sin notificaciones sin leer", async () => {
        const user = await createUser();
        const token = generateAccessToken(user.id);

        const res = await request(app)
            .get("/api/notifications/unread-count")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.count).toBe(0);
    });

    it("devuelve conteo de no leídas", async () => {
        const user = await createUser();
        const token = generateAccessToken(user.id);
        await createNotification(user.id);
        await createNotification(user.id);

        const res = await request(app)
            .get("/api/notifications/unread-count")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        expect(res.body.data.count).toBe(2);
    });

    it("excluye notificaciones leídas del conteo", async () => {
        const user = await createUser();
        const token = generateAccessToken(user.id);
        const notif = await createNotification(user.id);

        await prisma.notification.update({
            where: { id: notif.id },
            data: { read: true },
        });

        const res = await request(app)
            .get("/api/notifications/unread-count")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        expect(res.body.data.count).toBe(0);
    });
});

describe("PATCH /api/notifications/:id/read", () => {
    it("marca notificación como leída", async () => {
        const user = await createUser();
        const token = generateAccessToken(user.id);
        const notif = await createNotification(user.id);

        const res = await request(app)
            .patch(`/api/notifications/${notif.id}/read`)
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        expect(res.body.success).toBe(true);

        const updated = await prisma.notification.findUnique({ where: { id: notif.id } });
        expect(updated.read).toBe(true);
    });

    it("rechaza notificación de otro usuario", async () => {
        const user1 = await createUser();
        const user2 = await createUser();
        const token = generateAccessToken(user1.id);
        const notif = await createNotification(user2.id);

        const res = await request(app)
            .patch(`/api/notifications/${notif.id}/read`)
            .set("Authorization", `Bearer ${token}`)
            .expect(404);

        expect(res.body.success).toBe(false);
    });

    it("rechaza id inexistente con 404", async () => {
        const user = await createUser();
        const token = generateAccessToken(user.id);

        const res = await request(app)
            .patch("/api/notifications/nonexistent-id/read")
            .set("Authorization", `Bearer ${token}`)
            .expect(404);

        expect(res.body.success).toBe(false);
    });
});

describe("POST /api/notifications/read-all", () => {
    it("marca todas como leídas", async () => {
        const user = await createUser();
        const token = generateAccessToken(user.id);
        await createNotification(user.id);
        await createNotification(user.id);

        const res = await request(app)
            .post("/api/notifications/read-all")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        expect(res.body.success).toBe(true);

        const unread = await prisma.notification.count({
            where: { userId: user.id, read: false },
        });
        expect(unread).toBe(0);
    });

    it("no afecta notificaciones de otros usuarios", async () => {
        const user1 = await createUser();
        const user2 = await createUser();
        const token = generateAccessToken(user1.id);
        await createNotification(user2.id);

        await request(app)
            .post("/api/notifications/read-all")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        const unreadOther = await prisma.notification.count({
            where: { userId: user2.id, read: false },
        });
        expect(unreadOther).toBe(1);
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

    expect(res.body.data.subscribed).toBe(true);
  });

  it("devuelve subscribed=false si no existe", async () => {
    const user = await createUser();
    const token = generateAccessToken(user.id);

    const res = await request(app)
      .get("/api/notifications/status?endpoint=https://example.com/push/nonexistent")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.subscribed).toBe(false);
  });
});
