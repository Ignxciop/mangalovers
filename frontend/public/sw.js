self.addEventListener("push", (event) => {
    if (!event.data) return;

    const payload = event.data.json();

    const options = {
        body: payload.body,
        icon: payload.icon,
        badge: payload.badge,
        tag: payload.tag,
        renotify: payload.renotify,
        data: payload.data,
    };

    event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const url = event.notification.data?.url || "/";

    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientsArr) => {
                // Si ya hay una pestaña abierta → enfocarla
                for (const client of clientsArr) {
                    if (client.url.includes(url) && "focus" in client) {
                        return client.focus();
                    }
                }

                // Si no hay → abrir nueva
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            }),
    );
});
