const CACHE_NAME = "safeed-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./test1.html",
  "./assets/css/styles.css",
  "./assets/js/app.js",
  "./assets/js/data.js",
  "./assets/brand/favicon.svg",
  "./assets/brand/safeed-logo.svg",
  "./assets/brand/safeed-mark.svg",
  "./site.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          const sameOrigin = new URL(event.request.url).origin === self.location.origin;
          if (sameOrigin && response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return cachedResponse;
        });
    }),
  );
});
