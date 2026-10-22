// Service worker source. The build fills in the cache version and the file list below.
/* global __FILES__ */
const CACHE = "seatreason-__VERSION__";
const FILES = __FILES__;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("seatreason-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin)
    return;
  if (req.mode === "navigate") {
    // Page loads try the network first so a new version is picked up online.
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(new URL("./", self.location).href, {
          ignoreSearch: true,
          ignoreVary: true,
        }),
      ),
    );
    return;
  }
  event.respondWith(
    caches.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req)),
  );
});
