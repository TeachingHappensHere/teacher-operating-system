
const CACHE_NAME = "teaching-happens-here-v51-instructional-content";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./saved-progress.js",
  "./universal-search.js",
  "./app-health.js",
  "./backup-export.js",
  "./launch-candidate.js",
  "./instructional-content-v5-1.js",
  "./instructional-content-v5-1.json",
  "./style-additions-v4-6.css",
  "./style-additions-v4-7.css",
  "./style-additions-v4-8.css",
  "./style-additions-v4-9.css",
  "./style-additions-v5-0.css",
  "./style-additions-v5-1.css"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(ASSETS.map(asset => cache.add(asset).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
