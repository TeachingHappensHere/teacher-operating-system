
const CACHE = "teaching-happens-here-v17-1-classroom-launch";
const CORE = [
  "./",
  "./index.html",
  "./style.css?v=16.4.0",
  "./teacher-intelligence-v1602.css?v=16.0.2",
  "./style-additions-v7-1.css",
  "./app.js?v=17.1.0",
  "./teacher-intelligence-v1602.js?v=16.0.2",
  "./launch-stabilization-v7-1.js",
  "./tos-data.json",
  "./manifest.json",
  "./icon-192.svg",
  "./icon-512.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => key === CACHE ? null : caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isCore =
    url.pathname.endsWith("/app.js?v=17.1.0") ||
    url.pathname.endsWith("/style.css?v=16.4.0") ||
    url.pathname.endsWith("/tos-data.json") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/");

  if (isCore) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
    )
  );
});
