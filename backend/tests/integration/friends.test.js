import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../helpers/app.js";
import { prisma } from "../helpers/prisma.js";
import { createUser } from "../helpers/factories.js";
import { generateAccessToken } from "../helpers/auth.js";

const app = buildApp();

async function auth(user) {
    return { Authorization: `Bearer ${generateAccessToken(user.id)}` };
}

describe("GET /api/friends/search", () => {
    it("devuelve usuarios que coinciden con la busqueda", async () => {
        const user = await createUser();
        const target = await createUser({ name: "Juan", lastname: "Perez" });

        const res = await request(app)
            .get("/api/friends/search?q=juan")
            .set(await auth(user))
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data[0].id).toBe(target.id);
    });

    it("excluye al usuario actual", async () => {
        const user = await createUser({ name: "Test", lastname: "Search" });

        const res = await request(app)
            .get("/api/friends/search?q=test")
            .set(await auth(user))
            .expect(200);

        expect(res.body.data.every((u) => u.id !== user.id)).toBe(true);
    });

    it("rechaza query menor a 2 caracteres", async () => {
        const user = await createUser();

        const res = await request(app)
            .get("/api/friends/search?q=a")
            .set(await auth(user))
            .expect(400);

        expect(res.body.success).toBe(false);
    });

    it("devuelve array vacio sin coincidencias", async () => {
        const user = await createUser();

        const res = await request(app)
            .get("/api/friends/search?q=zzzzzzz")
            .set(await auth(user))
            .expect(200);

        expect(res.body.data).toEqual([]);
    });

    it("rechaza sin autenticacion", async () => {
        const res = await request(app)
            .get("/api/friends/search?q=test")
            .expect(401);

        expect(res.body.success).toBe(false);
    });
});

describe("POST /api/friends/request", () => {
    it("envia solicitud de amistad exitosamente", async () => {
        const sender = await createUser();
        const receiver = await createUser();

        const res = await request(app)
            .post("/api/friends/request")
            .set(await auth(sender))
            .send({ receiverId: receiver.id })
            .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("PENDING");
        expect(res.body.data.senderId).toBe(sender.id);
        expect(res.body.data.receiverId).toBe(receiver.id);
    });

    it("rechaza solicitud a si mismo", async () => {
        const user = await createUser();

        const res = await request(app)
            .post("/api/friends/request")
            .set(await auth(user))
            .send({ receiverId: user.id })
            .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/ti mismo/i);
    });

    it("rechaza solicitud duplicada", async () => {
        const sender = await createUser();
        const receiver = await createUser();

        await prisma.friend.create({
            data: { senderId: sender.id, receiverId: receiver.id, status: "PENDING" },
        });

        const res = await request(app)
            .post("/api/friends/request")
            .set(await auth(sender))
            .send({ receiverId: receiver.id })
            .expect(409);

        expect(res.body.success).toBe(false);
    });

    it("rechaza solicitud a usuario bloqueado", async () => {
        const sender = await createUser();
        const receiver = await createUser();

        await prisma.friend.create({
            data: { senderId: sender.id, receiverId: receiver.id, status: "BLOCKED", blockedById: sender.id },
        });

        const res = await request(app)
            .post("/api/friends/request")
            .set(await auth(sender))
            .send({ receiverId: receiver.id })
            .expect(403);

        expect(res.body.success).toBe(false);
    });

    it("rechaza receiverId no UUID", async () => {
        const user = await createUser();

        const res = await request(app)
            .post("/api/friends/request")
            .set(await auth(user))
            .send({ receiverId: "not-a-uuid" })
            .expect(400);

        expect(res.body.success).toBe(false);
    });

    it("rechaza receiverId inexistente", async () => {
        const user = await createUser();

        const res = await request(app)
            .post("/api/friends/request")
            .set(await auth(user))
            .send({ receiverId: "00000000-0000-0000-0000-000000000000" })
            .expect(404);

        expect(res.body.success).toBe(false);
    });

    it("rechaza sin autenticacion", async () => {
        const res = await request(app)
            .post("/api/friends/request")
            .send({ receiverId: "00000000-0000-0000-0000-000000000000" })
            .expect(401);

        expect(res.body.success).toBe(false);
    });
});

describe("PATCH /api/friends/request/:id/accept", () => {
    it("acepta solicitud de amistad", async () => {
        const sender = await createUser();
        const receiver = await createUser();

        const friend = await prisma.friend.create({
            data: { senderId: sender.id, receiverId: receiver.id, status: "PENDING" },
        });

        const res = await request(app)
            .patch(`/api/friends/request/${friend.id}/accept`)
            .set(await auth(receiver))
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("ACCEPTED");
    });

    it("rechaza aceptar solicitud propia", async () => {
        const sender = await createUser();
        const receiver = await createUser();

        const friend = await prisma.friend.create({
            data: { senderId: sender.id, receiverId: receiver.id, status: "PENDING" },
        });

        const res = await request(app)
            .patch(`/api/friends/request/${friend.id}/accept`)
            .set(await auth(sender))
            .expect(403);

        expect(res.body.success).toBe(false);
    });

    it("rechaza aceptar solicitud inexistente", async () => {
        const user = await createUser();

        const res = await request(app)
            .patch("/api/friends/request/99999/accept")
            .set(await auth(user))
            .expect(404);

        expect(res.body.success).toBe(false);
    });

    it("rechaza aceptar solicitud ya aceptada", async () => {
        const sender = await createUser();
        const receiver = await createUser();

        const friend = await prisma.friend.create({
            data: { senderId: sender.id, receiverId: receiver.id, status: "ACCEPTED" },
        });

        const res = await request(app)
            .patch(`/api/friends/request/${friend.id}/accept`)
            .set(await auth(receiver))
            .expect(409);

        expect(res.body.success).toBe(false);
    });
});

describe("PATCH /api/friends/request/:id/reject", () => {
    it("rechaza solicitud de amistad", async () => {
        const sender = await createUser();
        const receiver = await createUser();

        const friend = await prisma.friend.create({
            data: { senderId: sender.id, receiverId: receiver.id, status: "PENDING" },
        });

        const res = await request(app)
            .patch(`/api/friends/request/${friend.id}/reject`)
            .set(await auth(receiver))
            .expect(200);

        expect(res.body.success).toBe(true);

        const deleted = await prisma.friend.findUnique({ where: { id: friend.id } });
        expect(deleted).toBeNull();
    });
});

describe("GET /api/friends", () => {
    it("devuelve lista de amigos", async () => {
        const user = await createUser();
        const friend1 = await createUser();
        const friend2 = await createUser();

        await prisma.friend.create({
            data: { senderId: user.id, receiverId: friend1.id, status: "ACCEPTED" },
        });
        await prisma.friend.create({
            data: { senderId: friend2.id, receiverId: user.id, status: "ACCEPTED" },
        });

        const res = await request(app)
            .get("/api/friends")
            .set(await auth(user))
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(2);
    });

    it("devuelve array vacio sin amigos", async () => {
        const user = await createUser();

        const res = await request(app)
            .get("/api/friends")
            .set(await auth(user))
            .expect(200);

        expect(res.body.data).toEqual([]);
    });
});

describe("GET /api/friends/requests/received/count", () => {
    it("devuelve 0 sin solicitudes pendientes", async () => {
        const user = await createUser();

        const res = await request(app)
            .get("/api/friends/requests/received/count")
            .set(await auth(user))
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.count).toBe(0);
    });

    it("devuelve cantidad de solicitudes pendientes", async () => {
        const sender = await createUser();
        const sender2 = await createUser();
        const receiver = await createUser();

        await prisma.friend.createMany({
            data: [
                { senderId: sender.id, receiverId: receiver.id, status: "PENDING" },
                { senderId: sender2.id, receiverId: receiver.id, status: "PENDING" },
            ],
        });

        const res = await request(app)
            .get("/api/friends/requests/received/count")
            .set(await auth(receiver))
            .expect(200);

        expect(res.body.data.count).toBe(2);
    });

    it("no cuenta solicitudes aceptadas", async () => {
        const sender = await createUser();
        const receiver = await createUser();

        await prisma.friend.create({
            data: { senderId: sender.id, receiverId: receiver.id, status: "ACCEPTED" },
        });

        const res = await request(app)
            .get("/api/friends/requests/received/count")
            .set(await auth(receiver))
            .expect(200);

        expect(res.body.data.count).toBe(0);
    });
});

describe("GET /api/friends/requests/received", () => {
    it("devuelve solicitudes recibidas pendientes", async () => {
        const sender = await createUser();
        const receiver = await createUser();

        await prisma.friend.create({
            data: { senderId: sender.id, receiverId: receiver.id, status: "PENDING" },
        });

        const res = await request(app)
            .get("/api/friends/requests/received")
            .set(await auth(receiver))
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].sender.id).toBe(sender.id);
    });

    it("oculta solicitudes ya aceptadas", async () => {
        const sender = await createUser();
        const receiver = await createUser();

        await prisma.friend.create({
            data: { senderId: sender.id, receiverId: receiver.id, status: "ACCEPTED" },
        });

        const res = await request(app)
            .get("/api/friends/requests/received")
            .set(await auth(receiver))
            .expect(200);

        expect(res.body.data).toHaveLength(0);
    });
});

describe("GET /api/friends/requests/sent", () => {
    it("devuelve solicitudes enviadas pendientes", async () => {
        const sender = await createUser();
        const receiver = await createUser();

        await prisma.friend.create({
            data: { senderId: sender.id, receiverId: receiver.id, status: "PENDING" },
        });

        const res = await request(app)
            .get("/api/friends/requests/sent")
            .set(await auth(sender))
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].receiver.id).toBe(receiver.id);
    });
});

describe("POST /api/friends/block", () => {
    it("bloquea a un usuario", async () => {
        const user = await createUser();
        const target = await createUser();

        const res = await request(app)
            .post("/api/friends/block")
            .set(await auth(user))
            .send({ userId: target.id })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("BLOCKED");
    });

    it("rechaza bloquearte a ti mismo", async () => {
        const user = await createUser();

        const res = await request(app)
            .post("/api/friends/block")
            .set(await auth(user))
            .send({ userId: user.id })
            .expect(400);

        expect(res.body.success).toBe(false);
    });

    it("rechaza bloquear usuario inexistente", async () => {
        const user = await createUser();

        const res = await request(app)
            .post("/api/friends/block")
            .set(await auth(user))
            .send({ userId: "00000000-0000-0000-0000-000000000000" })
            .expect(404);

        expect(res.body.success).toBe(false);
    });
});

describe("POST /api/friends/unblock", () => {
    it("desbloquea a un usuario", async () => {
        const user = await createUser();
        const target = await createUser();

        await prisma.friend.create({
            data: { senderId: user.id, receiverId: target.id, status: "BLOCKED", blockedById: user.id },
        });

        const res = await request(app)
            .post("/api/friends/unblock")
            .set(await auth(user))
            .send({ userId: target.id })
            .expect(200);

        expect(res.body.success).toBe(true);

        const block = await prisma.friend.findFirst({
            where: { senderId: user.id, receiverId: target.id },
        });
        expect(block).toBeNull();
    });

    it("rechaza desbloquear a alguien no bloqueado", async () => {
        const user = await createUser();
        const target = await createUser();

        const res = await request(app)
            .post("/api/friends/unblock")
            .set(await auth(user))
            .send({ userId: target.id })
            .expect(404);

        expect(res.body.success).toBe(false);
    });
});

describe("GET /api/friends/blocked", () => {
    it("devuelve lista de usuarios bloqueados", async () => {
        const user = await createUser();
        const target = await createUser();

        await prisma.friend.create({
            data: { senderId: user.id, receiverId: target.id, status: "BLOCKED", blockedById: user.id },
        });

        const res = await request(app)
            .get("/api/friends/blocked")
            .set(await auth(user))
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].user.id).toBe(target.id);
    });
});

describe("DELETE /api/friends/:userId", () => {
    it("elimina amigo", async () => {
        const user = await createUser();
        const friend = await createUser();

        await prisma.friend.create({
            data: { senderId: user.id, receiverId: friend.id, status: "ACCEPTED" },
        });

        const res = await request(app)
            .delete(`/api/friends/${friend.id}`)
            .set(await auth(user))
            .expect(200);

        expect(res.body.success).toBe(true);

        const friendship = await prisma.friend.findFirst({
            where: { senderId: user.id, receiverId: friend.id },
        });
        expect(friendship).toBeNull();
    });

    it("rechaza eliminar a alguien que no es amigo", async () => {
        const user = await createUser();
        const stranger = await createUser();

        const res = await request(app)
            .delete(`/api/friends/${stranger.id}`)
            .set(await auth(user))
            .expect(200);

        expect(res.body.success).toBe(true);
    });
});

describe("GET /api/friends/feed", () => {
    it("devuelve feed de actividad paginado", async () => {
        const user = await createUser();
        const friend = await createUser();

        await prisma.friend.create({
            data: { senderId: user.id, receiverId: friend.id, status: "ACCEPTED" },
        });

        await prisma.userActivity.createMany({
            data: [
                { userId: friend.id, event: "MARK_READ", metadata: {} },
                { userId: friend.id, event: "ADD_FAVORITE", metadata: {} },
            ],
        });

        const res = await request(app)
            .get("/api/friends/feed")
            .set(await auth(user))
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(2);
        expect(res.body.total).toBe(2);
    });

    it("devuelve feed vacio sin amigos", async () => {
        const user = await createUser();

        const res = await request(app)
            .get("/api/friends/feed")
            .set(await auth(user))
            .expect(200);

        expect(res.body.data).toEqual([]);
        expect(res.body.total).toBe(0);
    });
});

describe("GET /api/friends/series-activity", () => {
    it("devuelve actividad de amigos en series", async () => {
        const user = await createUser();
        const friend = await createUser();
        const series = await (await import("../helpers/factories.js")).createSeries();

        await prisma.friend.create({
            data: { senderId: user.id, receiverId: friend.id, status: "ACCEPTED" },
        });

        await prisma.userFavorite.create({
            data: { userId: friend.id, seriesId: series.id, status: "Siguiendo" },
        });

        const res = await request(app)
            .get(`/api/friends/series-activity?seriesIds=${series.id}`)
            .set(await auth(user))
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data[series.id]).toBeDefined();
        expect(res.body.data[series.id]).toHaveLength(1);
        expect(res.body.data[series.id][0].userId).toBe(friend.id);
    });
});

describe("GET /api/friends/series/:seriesId/reads", () => {
    it("devuelve lecturas de amigos en una serie", async () => {
        const user = await createUser();
        const friend = await createUser();
        const series = await (await import("../helpers/factories.js")).createSeries();
        const chapter = await (await import("../helpers/factories.js")).createChapter(series.id);

        await prisma.friend.create({
            data: { senderId: user.id, receiverId: friend.id, status: "ACCEPTED" },
        });

        await prisma.userChapterRead.create({
            data: { userId: friend.id, chapterId: chapter.id },
        });

        const res = await request(app)
            .get(`/api/friends/series/${series.id}/reads`)
            .set(await auth(user))
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].userId).toBe(friend.id);
    });
});
