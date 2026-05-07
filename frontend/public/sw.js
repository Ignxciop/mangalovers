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

const CACHE_NAME = "mangalovers-v1";

const APP_SHELL = [
    "/",
    "/index.html",
    "/manifest.json",
    "/icon-192.png",
    "/icon-512.png",
];

/**
 * INSTALL
 */
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(APP_SHELL);
        }),
    );

    self.skipWaiting();
});

/**
 * ACTIVATE
 */
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                }),
            ),
        ),
    );

    self.clients.claim();
});

/**
 * FETCH
 */
self.addEventListener("fetch", (event) => {
    // No aceptar métodos que no sean GET en offline
    if (event.request.method !== "GET") return;

    const url = new URL(event.request.url);

    // No cachear API
    if (url.pathname.startsWith("/api")) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request)
                .then((networkResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(() => {
                    if (event.request.mode === "navigate") {
                        return caches.match("/");
                    }
                });
        }),
    );
});
