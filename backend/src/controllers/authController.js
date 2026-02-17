import { AuthService } from "../services/authService.js";

export class AuthController {
    static async register(req, res, next) {
        try {
            const result = await AuthService.register(req.body);

            res.status(201).json({
                success: true,
                message: "Usuario registrado exitosamente",
                data: {
                    user: result.user,
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken,
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

            res.status(200).json({
                success: true,
                message: "Inicio de sesión exitoso",
                data: { user, accessToken, refreshToken },
            });
        } catch (error) {
            next(error);
        }
    }

    static async refresh(req, res, next) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({
                    success: false,
                    message: "Refresh token requerido",
                });
            }

            const {
                user,
                accessToken,
                refreshToken: newRefreshToken,
            } = await AuthService.refreshAccessToken(refreshToken);

            res.status(200).json({
                success: true,
                message: "Token renovado exitosamente",
                data: { user, accessToken, refreshToken: newRefreshToken },
            });
        } catch (error) {
            next(error);
        }
    }

    static async logout(req, res, next) {
        try {
            const { refreshToken } = req.body;
            await AuthService.logout(refreshToken);

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

    static async verifyEmail(req, res, next) {
        try {
            const { email, code } = req.body;

            const { user, accessToken, refreshToken } =
                await AuthService.verifyEmail(email, code);

            res.status(200).json({
                success: true,
                message: "Email verificado exitosamente",
                data: { user, accessToken, refreshToken },
            });
        } catch (error) {
            next(error);
        }
    }

    static async resendVerification(req, res, next) {
        try {
            const { email } = req.body;
            const result = await AuthService.resendVerification(email);

            res.status(200).json({
                success: true,
                message: result.message,
            });
        } catch (error) {
            next(error);
        }
    }
}
