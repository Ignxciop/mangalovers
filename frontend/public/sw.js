function sanitizeString(str) {
    if (typeof str !== "string") return "";
    return str.slice(0, 255);
}

function isValidUrl(url) {
    if (typeof url !== "string") return false;
    try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

self.addEventListener("push", (event) => {
    if (!event.data) return;

    try {
        const payload = event.data.json();

        if (!payload.title || typeof payload.title !== "string") return;

        const options = {
            body: sanitizeString(payload.body),
            icon: isValidUrl(payload.icon) ? payload.icon : undefined,
            badge: isValidUrl(payload.badge) ? payload.badge : undefined,
            tag: sanitizeString(payload.tag) || undefined,
            renotify: !!payload.renotify,
            data: {
                url: isValidUrl(payload.data?.url) ? payload.data.url : "/",
                seriesId: Number.isInteger(payload.data?.seriesId)
                    ? payload.data.seriesId
                    : undefined,
            },
        };

        event.waitUntil(
            self.registration.showNotification(payload.title, options),
        );
    } catch {
        // Payload inválido, ignorar notificación
    }
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const url = event.notification.data?.url || "/";

    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientsArr) => {
                for (const client of clientsArr) {
                    if (client.url.includes(url) && "focus" in client) {
                        return client.focus();
                    }
                }

                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            }),
    );
});
