import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";

// Clave por userId → funciona con múltiples cuentas en el mismo browser
function getStorageKey(userId: string): string {
    return `notif_prompted_${userId}`;
}

/**
 * Controla si se debe mostrar el modal de notificaciones.
 *
 * Reglas:
 * - Solo se muestra UNA vez por usuario (guardado en localStorage)
 * - Solo si el navegador soporta push notifications
 * - Solo si el permiso no fue ya concedido o denegado previamente
 */
export function useNotificationPrompt() {
    const user = useAuthStore((s) => s.user);
    const [shouldShow, setShouldShow] = useState(false);

    useEffect(() => {
        if (!user?.id) return;

        // Si el navegador no soporta notificaciones, no mostrar nunca
        if (
            !("Notification" in window) ||
            !("PushManager" in window) ||
            !("serviceWorker" in navigator)
        )
            return;

        // Si ya tomó una decisión en el browser (granted o denied), no preguntar
        if (Notification.permission !== "default") return;

        // Si ya le mostramos el modal a este usuario, no volver a mostrar
        const alreadyPrompted = localStorage.getItem(getStorageKey(user.id));
        if (alreadyPrompted) return;

        // Pequeño delay para no mostrar el modal justo al entrar
        const timer = setTimeout(() => setShouldShow(true), 1500);
        return () => clearTimeout(timer);
    }, [user?.id]);

    function dismiss() {
        if (!user?.id) return;
        localStorage.setItem(getStorageKey(user.id), "true");
        setShouldShow(false);
    }

    return { shouldShow, dismiss };
}
