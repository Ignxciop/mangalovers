import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

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

    // iOS: Push solo funciona en modo standalone (PWA instalada)
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
 * Obtiene el access token JWT del storage.
 * Ajusta esto a donde guardas el token en tu app.
 */
function getAccessToken(): string {
    return localStorage.getItem("accessToken") ?? "";
}

// ── Hook ──────────────────────────────────────────────────────────────────

/**
 * Hook principal para manejar notificaciones push.
 *
 * Uso:
 *   const { permission, subscribed, supported, subscribe, unsubscribe } = usePushNotifications();
 */
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
        const res = await fetch(`${API_BASE}/notifications/subscribe`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getAccessToken()}`,
            },
            body: JSON.stringify({
                endpoint: subJSON.endpoint,
                keys: {
                    p256dh: subJSON.keys?.p256dh,
                    auth: subJSON.keys?.auth,
                },
            }),
        });

        if (!res.ok) {
            const data = (await res.json().catch(() => ({}))) as {
                error?: string;
            };
            throw new Error(data.error ?? "Error registrando suscripción");
        }
    }

    // Al montar: verificar si ya hay suscripción activa en este dispositivo
    useEffect(() => {
        if (!supported) return;

        async function checkExistingSubscription(): Promise<void> {
            try {
                const reg = await navigator.serviceWorker.ready;
                const existing = await reg.pushManager.getSubscription();

                if (!existing) return;

                // Verificar que el backend también la tiene registrada
                const res = await fetch(
                    `${API_BASE}/notifications/status?endpoint=${encodeURIComponent(existing.endpoint)}`,
                    {
                        headers: {
                            Authorization: `Bearer ${getAccessToken()}`,
                        },
                    },
                );

                if (!res.ok) return;

                const { subscribed: isSubscribed } = (await res.json()) as {
                    subscribed: boolean;
                };
                setSubscribed(isSubscribed);

                // Si el backend no la tiene (p.ej. se limpió la BD), re-registrar
                if (!isSubscribed) {
                    await registerSubscriptionToBackend(existing);
                    setSubscribed(true);
                }
            } catch (err) {
                // Silencioso: no afecta la UX si falla el check inicial
                console.warn("Error verificando suscripción existente:", err);
            }
        }

        void checkExistingSubscription();
    }, [supported]);

    /**
     * Pide permiso, registra el SW y suscribe al push manager.
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

            // 2. Esperar a que el SW esté listo
            const registration = await navigator.serviceWorker.ready;

            // 3. Obtener clave pública VAPID del backend
            const vapidRes = await fetch(
                `${API_BASE}/notifications/vapid-public-key`,
            );
            const { publicKey } = (await vapidRes.json()) as {
                publicKey: string;
            };

            // 4. Suscribirse al PushManager
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true, // Obligatorio: siempre mostrar notificación
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
            const registration = await navigator.serviceWorker.ready;
            const subscription =
                await registration.pushManager.getSubscription();

            if (subscription) {
                // Eliminar del backend primero
                await fetch(`${API_BASE}/notifications/unsubscribe`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${getAccessToken()}`,
                    },
                    body: JSON.stringify({ endpoint: subscription.endpoint }),
                });

                // Luego cancelar en el browser
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
