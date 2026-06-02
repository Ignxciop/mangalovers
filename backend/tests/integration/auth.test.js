import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { buildApp } from "../helpers/app.js";
import { prisma } from "../helpers/prisma.js";
import { createUser } from "../helpers/factories.js";
import { generateAccessToken } from "../helpers/auth.js";
import bcrypt from "bcryptjs";

const app = buildApp();

describe("POST /api/auth/register", () => {
    const validUser = {
        email: "testuser@gmail.com",
        password: "Password123!",
        name: "Test",
        lastname: "User",
    };

    it("registra usuario exitosamente y devuelve tokens + cookie", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send(validUser)
            .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data.user.email).toBe(validUser.email);
        expect(res.body.data.accessToken).toBeDefined();

        const cookies = res.headers["set-cookie"];
        expect(cookies).toBeDefined();
        expect(cookies.some((c) => c.startsWith("refreshToken="))).toBe(true);

        const user = await prisma.user.findUnique({
            where: { email: validUser.email },
        });
        expect(user).not.toBeNull();
    });

    it("rechaza email duplicado con 409", async () => {
        await createUser({ email: validUser.email });

        const res = await request(app)
            .post("/api/auth/register")
            .send(validUser)
            .expect(409);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/ya existe/i);
    });

    it("rechaza dominio de email no permitido", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ ...validUser, email: "test@example.com" })
            .expect(400);

        expect(res.body.success).toBe(false);
    });

    it("rechaza email sin formato válido", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ ...validUser, email: "invalido" })
            .expect(400);

        expect(res.body.success).toBe(false);
    });
});

describe("POST /api/auth/login", () => {
    const credentials = {
        email: "login-test@gmail.com",
        password: "Password123!",
    };

    beforeEach(async () => {
        await createUser(credentials);
    });

    it("inicia sesión exitosamente y devuelve tokens + cookie", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send(credentials)
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBeDefined();
        expect(res.body.data.user).not.toHaveProperty("password");

        const cookies = res.headers["set-cookie"];
        expect(cookies.some((c) => c.startsWith("refreshToken="))).toBe(true);
    });

    it("rechaza contraseña incorrecta con 401", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ ...credentials, password: "WrongPass1!" })
            .expect(401);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Credenciales inválidas/i);
    });

    it("rechaza email inexistente con 401 (mismo mensaje)", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "noexiste@gmail.com", password: "Password123!" })
            .expect(401);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Credenciales inválidas/i);
    });
});

describe("POST /api/auth/refresh", () => {
    async function loginAndGetCookie() {
        const user = await createUser({
            email: "refresh-test@gmail.com",
            password: "Password123!",
        });
        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: user.email, password: "Password123!" });
        const cookies = loginRes.headers["set-cookie"];
        const refreshCookie = cookies.findLast((c) =>
            c.startsWith("refreshToken=") && !c.includes("Max-Age=0"),
        );
        const refreshToken = refreshCookie.split(";")[0].split("=")[1];
        return { user, refreshToken, accessToken: loginRes.body.data.accessToken };
    }

    it("renueva tokens con refresh token válido", async () => {
        const { refreshToken } = await loginAndGetCookie();

        const res = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", `refreshToken=${refreshToken}`)
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBeDefined();

        const newCookies = res.headers["set-cookie"];
        expect(newCookies.filter((c) => c.startsWith("refreshToken=") && !c.includes("Max-Age=0")).length).toBeGreaterThanOrEqual(1);
    });

    it("rechaza refresh sin cookie con 401", async () => {
        const res = await request(app)
            .post("/api/auth/refresh")
            .expect(401);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Refresh token requerido/i);
    });

    it("rechaza refresh token inválido con 401", async () => {
        const res = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", "refreshToken=invalidtoken123")
            .expect(401);

        expect(res.body.success).toBe(false);
    });
});

describe("POST /api/auth/logout", () => {
    it("cierra sesión y limpia cookie", async () => {
        const user = await createUser({
            email: "logout-test@gmail.com",
            password: "Password123!",
        });
        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: user.email, password: "Password123!" });
        const cookies = loginRes.headers["set-cookie"];
        const refreshCookie = cookies.findLast((c) =>
            c.startsWith("refreshToken=") && !c.includes("Max-Age=0"),
        );
        const refreshToken = refreshCookie.split(";")[0].split("=")[1];
        const accessToken = loginRes.body.data.accessToken;

        const res = await request(app)
            .post("/api/auth/logout")
            .set("Authorization", `Bearer ${accessToken}`)
            .set("Cookie", `refreshToken=${refreshToken}`)
            .expect(200);

        expect(res.body.success).toBe(true);

        const token = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
        });
        expect(token.isRevoked).toBe(true);
    });
});

describe("POST /api/auth/logout-all", () => {
    it("revoca todas las sesiones activas", async () => {
        const user = await createUser({
            email: "logoutall-test@gmail.com",
            password: "Password123!",
        });
        const token = generateAccessToken(user.id);

        const res = await request(app)
            .post("/api/auth/logout-all")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        expect(res.body.success).toBe(true);
    });
});

describe("GET /api/auth/me", () => {
    it("devuelve el usuario autenticado", async () => {
        const user = await createUser({
            email: "me-test@gmail.com",
            password: "Password123!",
        });
        const token = generateAccessToken(user.id);

        const res = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.user.email).toBe(user.email);
    });

    it("rechaza sin autenticación con 401", async () => {
        const res = await request(app)
            .get("/api/auth/me")
            .expect(401);

        expect(res.body.success).toBe(false);
    });
});

describe("PATCH /api/auth/profile", () => {
    it("actualiza nombre y apellido", async () => {
        const user = await createUser({
            email: "profile-test@gmail.com",
            password: "Password123!",
        });
        const token = generateAccessToken(user.id);

        const res = await request(app)
            .patch("/api/auth/profile")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "NuevoNombre", lastname: "NuevoApellido" })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.user.name).toBe("NuevoNombre");
    });
});

describe("PATCH /api/auth/password", () => {
    it("cambia contraseña exitosamente", async () => {
        const user = await createUser({
            email: "password-test@gmail.com",
            password: "OldPass123!",
        });
        const token = generateAccessToken(user.id);

        const res = await request(app)
            .patch("/api/auth/password")
            .set("Authorization", `Bearer ${token}`)
            .send({ currentPassword: "OldPass123!", newPassword: "NewPass456!" })
            .expect(200);

        expect(res.body.success).toBe(true);

        const updated = await prisma.user.findUnique({ where: { id: user.id } });
        const valid = await bcrypt.compare("NewPass456!", updated.password);
        expect(valid).toBe(true);
    });

    it("rechaza con contraseña actual incorrecta", async () => {
        const user = await createUser({
            email: "badpass-test@gmail.com",
            password: "OldPass123!",
        });
        const token = generateAccessToken(user.id);

        const res = await request(app)
            .patch("/api/auth/password")
            .set("Authorization", `Bearer ${token}`)
            .send({ currentPassword: "WrongPass!", newPassword: "NewPass456!" })
            .expect(400);

        expect(res.body.success).toBe(false);
    });
});

describe("DELETE /api/auth/account", () => {
    it("elimina cuenta con contraseña correcta", async () => {
        const user = await createUser({
            email: "delete-test@gmail.com",
            password: "DeletePass1!",
        });
        const token = generateAccessToken(user.id);

        const res = await request(app)
            .delete("/api/auth/account")
            .set("Authorization", `Bearer ${token}`)
            .send({ password: "DeletePass1!" })
            .expect(200);

        expect(res.body.success).toBe(true);

        const deleted = await prisma.user.findUnique({ where: { id: user.id } });
        expect(deleted).toBeNull();
    });

    it("rechaza eliminación con contraseña incorrecta", async () => {
        const user = await createUser({
            email: "delete-fail-test@gmail.com",
            password: "DeletePass1!",
        });
        const token = generateAccessToken(user.id);

        const res = await request(app)
            .delete("/api/auth/account")
            .set("Authorization", `Bearer ${token}`)
            .send({ password: "WrongPass1!" })
            .expect(400);

        expect(res.body.success).toBe(false);
    });
});

describe("GET /api/auth/google-client-id", () => {
    it("devuelve el client ID de Google", async () => {
        const res = await request(app)
            .get("/api/auth/google-client-id")
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("clientId");
    });
});

describe("POST /api/auth/google", () => {
    it("rechaza login sin idToken (validación)", async () => {
        const res = await request(app)
            .post("/api/auth/google")
            .send({})
            .expect(400);

        expect(res.body.success).toBe(false);
    });

    it("rechaza login con idToken inválido", async () => {
        const res = await request(app)
            .post("/api/auth/google")
            .send({ idToken: "invalid-token-123" });

        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.body.success).toBe(false);
    });
});

describe("GET /api/auth/sessions", () => {
    it("devuelve sesiones activas del usuario", async () => {
        const user = await createUser({
            email: "sessions-test@gmail.com",
            password: "Password123!",
        });
        const token = generateAccessToken(user.id);

        await request(app)
            .post("/api/auth/login")
            .send({ email: user.email, password: "Password123!" });

        const res = await request(app)
            .get("/api/auth/sessions")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.sessions).toBeDefined();
        expect(Array.isArray(res.body.data.sessions)).toBe(true);
        expect(res.body.data.sessions.length).toBeGreaterThanOrEqual(1);
    });

    it("devuelve array vacío si no hay sesiones activas", async () => {
        const user = await createUser({
            email: "nosessions-test@gmail.com",
            password: "Password123!",
        });
        const token = generateAccessToken(user.id);

        const res = await request(app)
            .get("/api/auth/sessions")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.sessions).toEqual([]);
    });

    it("rechaza sin autenticación con 401", async () => {
        const res = await request(app)
            .get("/api/auth/sessions")
            .expect(401);

        expect(res.body.success).toBe(false);
    });
});

describe("GET /api/auth/status", () => {
    it("devuelve el estado del usuario autenticado", async () => {
        const user = await createUser();
        const token = generateAccessToken(user.id);

        const res = await request(app)
            .get("/api/auth/status")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("ACTIVE");
    });

    it("rechaza sin autenticación con 401", async () => {
        const res = await request(app)
            .get("/api/auth/status")
            .expect(401);

        expect(res.body.success).toBe(false);
    });
});

describe("PATCH /api/auth/alias", () => {
    it("actualiza alias exitosamente", async () => {
        const user = await createUser();
        const token = generateAccessToken(user.id);

        const res = await request(app)
            .patch("/api/auth/alias")
            .set("Authorization", `Bearer ${token}`)
            .send({ alias: "mi_alias_unico" })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.user.alias).toBe("mi_alias_unico");
        expect(res.body.data.user.aliasChanged).toBe(true);
    });

    it("rechaza alias duplicado con 409", async () => {
        const user1 = await createUser({ alias: "alias_en_uso" });
        const user2 = await createUser();
        const token = generateAccessToken(user2.id);

        const res = await request(app)
            .patch("/api/auth/alias")
            .set("Authorization", `Bearer ${token}`)
            .send({ alias: "alias_en_uso" })
            .expect(409);

        expect(res.body.success).toBe(false);
    });

    it("rechaza segundo cambio de alias", async () => {
        const user = await createUser();
        const token = generateAccessToken(user.id);

        await request(app)
            .patch("/api/auth/alias")
            .set("Authorization", `Bearer ${token}`)
            .send({ alias: "primer_alias" });

        const res = await request(app)
            .patch("/api/auth/alias")
            .set("Authorization", `Bearer ${token}`)
            .send({ alias: "segundo_alias" })
            .expect(400);

        expect(res.body.success).toBe(false);
    });

    it("rechaza alias vacío con 400", async () => {
        const user = await createUser();
        const token = generateAccessToken(user.id);

        const res = await request(app)
            .patch("/api/auth/alias")
            .set("Authorization", `Bearer ${token}`)
            .send({ alias: "" })
            .expect(400);

        expect(res.body.success).toBe(false);
    });

    it("rechaza sin autenticación con 401", async () => {
        const res = await request(app)
            .patch("/api/auth/alias")
            .send({ alias: "sin_auth" })
            .expect(401);

        expect(res.body.success).toBe(false);
    });
});
