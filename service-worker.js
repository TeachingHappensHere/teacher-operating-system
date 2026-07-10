
const CACHE_NAME = "teaching-happens-here-v47-universal-search";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./style-additions-v4-2.css",
  "./style-additions-v4-3.css",
  "./style-additions-v4-4.css",
  "./style-additions-v4-5.css",
  "./style-additions-v4-6.css",
  "./style-additions-v4-7.css",
  "./app.js",
  "./resource-files-viewer.js",
  "./student-dashboard-viewer.js",
  "./communication-hub-viewer.js",
  "./saved-progress.js",
  "./universal-search.js",
  "./manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        ASSETS.map(asset =>
          cache.add(asset).catch(error => {
            console.warn("Optional asset was not cached:", asset, error);
          })
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key =>
          key !== CACHE_NAME ? caches.delete(key) : Promise.resolve()
        )
      )
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
