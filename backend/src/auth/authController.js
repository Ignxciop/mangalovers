import { AuthService } from "./authService.js";
import { config } from "../config/env.js";

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: config.ENVIRONMENT === "production",
    sameSite: "strict",
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setRefreshCookie(res, refreshToken) {
    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);
}

function clearRefreshCookie(res) {
    res.clearCookie("refreshToken", { ...COOKIE_OPTIONS, maxAge: 0 });
}

export class AuthController {
    static async register(req, res, next) {
        try {
            const result = await AuthService.register(req.body);
            setRefreshCookie(res, result.refreshToken);

            res.status(201).json({
                success: true,
                message: "Usuario registrado exitosamente",
                data: {
                    user: result.user,
                    accessToken: result.accessToken,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    static async login(req, res, next) {
        try {
            const { user, accessToken, refreshToken } = await AuthService.login(
                req.body,
            );
            setRefreshCookie(res, refreshToken);

            res.status(200).json({
                success: true,
                message: "Inicio de sesión exitoso",
                data: { user, accessToken },
            });
        } catch (error) {
            next(error);
        }
    }

    static async googleLogin(req, res, next) {
        try {
            const { idToken } = req.body;

            if (!idToken) {
                return res.status(400).json({
                    success: false,
                    message: "Token de Google requerido",
                });
            }

            const { user, accessToken, refreshToken } =
                await AuthService.googleLogin(idToken);
            setRefreshCookie(res, refreshToken);

            res.status(200).json({
                success: true,
                message: "Inicio de sesión con Google exitoso",
                data: { user, accessToken },
            });
        } catch (error) {
            next(error);
        }
    }

    static async refresh(req, res, next) {
        try {
            const refreshToken = req.cookies?.refreshToken;

            if (!refreshToken) {
                return res.status(401).json({
                    success: false,
                    message: "Refresh token requerido",
                });
            }

            const {
                user,
                accessToken,
                refreshToken: newRefreshToken,
            } = await AuthService.refreshAccessToken(refreshToken);
            setRefreshCookie(res, newRefreshToken);

            res.status(200).json({
                success: true,
                message: "Token renovado exitosamente",
                data: { user, accessToken },
            });
        } catch (error) {
            next(error);
        }
    }

    static async logout(req, res, next) {
        try {
            const refreshToken = req.cookies?.refreshToken;
            await AuthService.logout(refreshToken);
            clearRefreshCookie(res);

            res.status(200).json({
                success: true,
                message: "Logout exitoso",
            });
        } catch (error) {
            next(error);
        }
    }

    static async logoutAll(req, res, next) {
        try {
            await AuthService.logoutAll(req.user.userId);

            res.status(200).json({
                success: true,
                message: "Se han cerrado todas las sesiones",
            });
        } catch (error) {
            next(error);
        }
    }

    static async getMe(req, res, next) {
        try {
            const user = await AuthService.getMe(req.user.userId);

            res.status(200).json({
                success: true,
                data: { user },
            });
        } catch (error) {
            next(error);
        }
    }

    static async getActiveSessions(req, res, next) {
        try {
            const sessions = await AuthService.getActiveSessions(
                req.user.userId,
            );

            res.status(200).json({
                success: true,
                data: { sessions },
            });
        } catch (error) {
            next(error);
        }
    }

    static async updateProfile(req, res, next) {
        try {
            const user = await AuthService.updateProfile(
                req.user.userId,
                req.body,
            );
            res.json({ success: true, data: { user } });
        } catch (error) {
            next(error);
        }
    }

    static async updatePassword(req, res, next) {
        try {
            await AuthService.updatePassword(req.user.userId, req.body);
            res.json({
                success: true,
                message: "Contraseña actualizada. Vuelve a iniciar sesión.",
            });
        } catch (error) {
            next(error);
        }
    }

    static async deleteAccount(req, res, next) {
        try {
            await AuthService.deleteAccount(req.user.userId, req.body);
            res.json({ success: true, message: "Cuenta eliminada" });
        } catch (error) {
            next(error);
        }
    }

    static async getGoogleClientId(req, res) {
        res.json({
            success: true,
            data: { clientId: config.GOOGLE_CLIENT_ID || "" },
        });
    }
}
