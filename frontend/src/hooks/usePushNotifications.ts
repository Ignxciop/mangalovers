import { useState, useEffect, useCallback } from "react";
import { api } from "@/api/axios";

// ── Tipos ─────────────────────────────────────────────────────────────────

type NotificationPermission = "default" | "granted" | "denied";

interface SupportCheckResult {
    supported: boolean;
    reason: string | null;
    isIOSInstallRequired: boolean;
}

interface UsePushNotificationsReturn {
    permission: NotificationPermission;
    subscribed: boolean;
    supported: boolean;
    supportReason: string | null;
    isIOSInstallRequired: boolean;
    loading: boolean;
    error: string | null;
    subscribe: () => Promise<void>;
    unsubscribe: () => Promise<void>;
}

// iOS Safari expone `standalone` en navigator pero no está en los tipos estándar
interface NavigatorWithStandalone extends Navigator {
    standalone?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Convierte la clave pública VAPID (base64 url-safe) al formato
 * Uint8Array que requiere PushManager.subscribe()
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * Detecta si el navegador soporta notificaciones push.
 * iOS requiere que la PWA esté instalada (standalone mode).
 */
function checkSupport(): SupportCheckResult {
    if (!("serviceWorker" in navigator)) {
        return {
            supported: false,
            reason: "Service Workers no soportados",
            isIOSInstallRequired: false,
        };
    }
    if (!("PushManager" in window)) {
        return {
            supported: false,
            reason: "Push API no soportada",
            isIOSInstallRequired: false,
        };
    }
    if (!("Notification" in window)) {
        return {
            supported: false,
            reason: "Notifications API no soportada",
            isIOSInstallRequired: false,
        };
    }

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as NavigatorWithStandalone).standalone === true;

    if (isIOS && !isStandalone) {
        return {
            supported: false,
            reason: "En iOS debes instalar la app primero (Añadir a pantalla de inicio)",
            isIOSInstallRequired: true,
        };
    }

    return { supported: true, reason: null, isIOSInstallRequired: false };
}

/**
 * Wrapper sobre navigator.serviceWorker.ready con timeout explícito.
 * Sin esto, en iOS el Promise puede quedarse colgado para siempre
 * si el SW no terminó de instalarse, sin lanzar ningún error.
 */
function getServiceWorkerReady(
    timeoutMs = 10_000,
): Promise<ServiceWorkerRegistration> {
    return Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
            setTimeout(
                () =>
                    reject(
                        new Error(
                            "El Service Worker tardó demasiado en activarse. Recarga la app e inténtalo de nuevo.",
                        ),
                    ),
                timeoutMs,
            ),
        ),
    ]);
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function usePushNotifications(): UsePushNotificationsReturn {
    const [permission, setPermission] = useState<NotificationPermission>(() =>
        typeof Notification !== "undefined"
            ? Notification.permission
            : "default",
    );
    const [subscribed, setSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        supported,
        reason: supportReason,
        isIOSInstallRequired,
    } = checkSupport();

    async function registerSubscriptionToBackend(
        subscription: PushSubscription,
    ): Promise<void> {
        const subJSON = subscription.toJSON();
        await api.post("/notifications/subscribe", {
            endpoint: subJSON.endpoint,
            keys: {
                p256dh: subJSON.keys?.p256dh,
                auth: subJSON.keys?.auth,
            },
        });
    }

    // Al montar: verificar si ya hay suscripción activa en este dispositivo
    useEffect(() => {
        if (!supported) return;

        async function checkExistingSubscription(): Promise<void> {
            try {
                // Timeout también en el check inicial — iOS puede colgarse aquí también
                const reg = await getServiceWorkerReady();
                const existing = await reg.pushManager.getSubscription();

                if (!existing) return;

                const res = await api.get("/notifications/status", {
                    params: {
                        endpoint: existing.endpoint,
                    },
                });

                const isSubscribed = res.data.subscribed;
                setSubscribed(isSubscribed);

                if (!isSubscribed) {
                    await registerSubscriptionToBackend(existing);
                    setSubscribed(true);
                }
            } catch (err) {
                console.warn("Error verificando suscripción existente:", err);
            }
        }

        void checkExistingSubscription();
    }, [supported]);

    /**
     * Pide permiso, espera el SW con timeout y suscribe al push manager.
     */
    const subscribe = useCallback(async (): Promise<void> => {
        if (!supported) return;
        setLoading(true);
        setError(null);

        try {
            // 1. Pedir permiso al usuario
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result !== "granted") {
                setError(
                    result === "denied"
                        ? "Permiso denegado. Habilita las notificaciones en la configuración del navegador."
                        : "Permiso no concedido.",
                );
                return;
            }

            // 2. Esperar SW con timeout — aquí se colgaba en iOS
            const registration = await getServiceWorkerReady();

            // 3. Obtener clave pública VAPID del backend
            const vapidRes = await api.get("/notifications/vapid-public-key");

            const { publicKey } = vapidRes.data;

            // 4. Suscribirse al PushManager
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
                    publicKey,
                ) as BufferSource,
            });

            // 5. Enviar suscripción al backend
            await registerSubscriptionToBackend(subscription);
            setSubscribed(true);
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "No se pudo activar las notificaciones";
            console.error("Error suscribiéndose:", err);
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [supported]);

    /**
     * Cancela la suscripción push del dispositivo actual.
     */
    const unsubscribe = useCallback(async (): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            const registration = await getServiceWorkerReady();
            const subscription =
                await registration.pushManager.getSubscription();

            if (subscription) {
                await api.delete("/notifications/unsubscribe", {
                    data: {
                        endpoint: subscription.endpoint,
                    },
                });

                await subscription.unsubscribe();
            }

            setSubscribed(false);
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "No se pudo desactivar las notificaciones";
            console.error("Error cancelando suscripción:", err);
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        permission,
        subscribed,
        supported,
        supportReason,
        isIOSInstallRequired,
        loading,
        error,
        subscribe,
        unsubscribe,
    };
}
