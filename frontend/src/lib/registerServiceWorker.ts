/**
 * Registra el Service Worker en el navegador.
 * Llama a esta función una sola vez en main.tsx o App.tsx.
 *
 * Si usas vite-plugin-pwa, este archivo NO es necesario —
 * el plugin lo registra automáticamente. Úsalo solo si
 * gestionas el SW de forma manual.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!("serviceWorker" in navigator)) {
        console.warn("Service Workers no están soportados en este navegador.");
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
            type: "classic",
        });

        // Escuchar actualizaciones del SW
        registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            newWorker?.addEventListener("statechange", () => {
                if (
                    newWorker.state === "installed" &&
                    navigator.serviceWorker.controller !== null
                ) {
                    // Hay una nueva versión disponible
                    console.log(
                        "Nueva versión del SW disponible. Recarga para actualizar.",
                    );
                    // Aquí podrías disparar un evento o mostrar un toast al usuario
                }
            });
        });

        console.log("Service Worker registrado:", registration.scope);
        return registration;
    } catch (error) {
        console.error("Error registrando Service Worker:", error);
        return null;
    }
}
