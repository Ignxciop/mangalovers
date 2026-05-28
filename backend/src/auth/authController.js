import { AuthService } from "./authService.js";
import { config } from "../config/env.js";
import { ActivityLogService } from "../activityLog/activityLogService.js";
import logger from "../config/logger.js";
import { processAvatar } from "../middlewares/uploadAvatar.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.ENVIRONMENT === "production",
  sameSite: "lax",
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setRefreshCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);
}

function clearRefreshCookie(res) {
  res.clearCookie("refreshToken", { ...COOKIE_OPTIONS, maxAge: 0 });
}

export async function register(req, res, next) {
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

    ActivityLogService.logEvent(
      result.user.id, "REGISTER",
      { email: result.user.email },
      req.ip, req.headers["user-agent"],
    ).catch((err) => logger.warn({ err, userId: result.user.id, event: "REGISTER" }, "ActivityLog error"));
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { user, accessToken, refreshToken } = await AuthService.login(req.body);
    setRefreshCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      message: "Inicio de sesión exitoso",
      data: { user, accessToken },
    });

    ActivityLogService.logEvent(
      user.id, "LOGIN",
      { email: user.email },
      req.ip, req.headers["user-agent"],
    ).catch((err) => logger.warn({ err, userId: user.id, event: "LOGIN" }, "ActivityLog error"));
  } catch (error) {
    next(error);
  }
}

export async function googleLogin(req, res, next) {
  try {
    const { user, accessToken, refreshToken } = await AuthService.googleLogin(req.body.idToken);
    setRefreshCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      message: "Inicio de sesión con Google exitoso",
      data: { user, accessToken },
    });

    ActivityLogService.logEvent(
      user.id, "LOGIN",
      { email: user.email, provider: "google" },
      req.ip, req.headers["user-agent"],
    ).catch((err) => logger.warn({ err, userId: user.id, event: "LOGIN" }, "ActivityLog error"));
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    await AuthService.logout(req.cookies?.refreshToken);
    res.clearCookie("refreshToken", { path: "/api/auth" });
    res.status(200).json({
      success: true,
      message: "Logout exitoso",
    });
  } catch (error) {
    next(error);
  }
}

export async function logoutAll(req, res, next) {
  try {
    await AuthService.logoutAll(req.user.userId);
    res.status(200).json({ success: true, message: "Se han cerrado todas las sesiones" });

    ActivityLogService.logEvent(
      req.user.userId, "LOGOUT",
      { allSessions: true },
      req.ip, req.headers["user-agent"],
    ).catch((err) => logger.warn({ err, userId: req.user.userId, event: "LOGOUT" }, "ActivityLog error"));
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const { user, accessToken, refreshToken: newRefreshToken } = await AuthService.refreshAccessToken(req.cookies?.refreshToken);
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

export async function getMe(req, res, next) {
  try {
    const user = await AuthService.getMe(req.user.userId);
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
}

export async function getMyStatus(req, res, next) {
  try {
    const userStatus = await AuthService.getMyStatus(req.user.userId);
    res.status(200).json({ success: true, data: userStatus });
  } catch (error) {
    next(error);
  }
}

export async function getActiveSessions(req, res, next) {
  try {
    const sessions = await AuthService.getActiveSessions(req.user.userId);
    res.status(200).json({ success: true, data: { sessions } });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const user = await AuthService.updateProfile(req.user.userId, req.body);
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
}

export async function updatePassword(req, res, next) {
  try {
    await AuthService.updatePassword(req.user.userId, req.body);
    res.json({ success: true, message: "Contraseña actualizada. Vuelve a iniciar sesión." });
  } catch (error) {
    next(error);
  }
}

export async function deleteAccount(req, res, next) {
  try {
    await AuthService.deleteAccount(req.user.userId, req.body);
    res.json({ success: true, message: "Cuenta eliminada" });
  } catch (error) {
    next(error);
  }
}

export async function updateAvatar(req, res, next) {
  try {
    const filename = await processAvatar(req.file);
    const user = await AuthService.updateAvatar(req.user.userId, filename);
    res.json({ success: true, data: { user } });

    ActivityLogService.logEvent(
      req.user.userId, "UPDATE_PROFILE",
      { field: "avatar" },
      req.ip, req.headers["user-agent"],
    ).catch((err) => logger.warn({ err, userId: req.user.userId, event: "UPDATE_PROFILE" }, "ActivityLog error"));
  } catch (error) {
    next(error);
  }
}

export async function getGoogleClientId(req, res, next) {
  try {
    res.json({ success: true, data: { clientId: config.GOOGLE_CLIENT_ID || "" } });
  } catch (error) {
    next(error);
  }
}

export async function getStatus(req, res, next) {
  try {
    const userStatus = await AuthService.getStatus(req.user.userId);
    res.json({ success: true, data: userStatus });
  } catch (error) {
    next(error);
  }
}
