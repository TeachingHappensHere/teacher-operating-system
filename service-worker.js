const CACHE = "mrs-parrish-tos-v18-2-2-roster-recovery";
const CORE = ["./","./index.html","./style.css?v=18.2.2-s2a","./sidebar-v162.css?v=18.2.2-s2a","./sprint1-dashboard.css?v=18.2.2-s2a","./sprint2a-command-center.css?v=18.2.2-s2a","./sprint2a-student-center.css?v=18.2.2-s2a","./app.js?v=18.2.2-s2a","./sprint1-storage.js?v=18.2.2-s2a","./sprint1-events.js?v=18.2.2-s2a","./sprint1-state.js?v=18.2.2-s2a","./sprint1-calendar.js?v=18.2.2-s2a","./sprint1-dashboard.js?v=18.2.2-s2a","./sprint2a-command-center.js?v=18.2.2-s2a","./sprint2a-student-center.js?v=18.2.2-s2a","./sprint1-navigation.js?v=18.2.2-s2a","./sprint1-diagnostics.js?v=18.2.2-s2a","./sprint1-compat.js?v=18.2.2-s2a","./sprint1-config.json","./sprint2a-command-center.json","./tos-data.json","./manifest.json","./icon-192.svg","./icon-512.svg"];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE))); self.skipWaiting(); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))); self.clients.claim(); });
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin === location.origin && (request.mode === "navigate" || url.pathname.endsWith(".js") || url.pathname.endsWith(".json") || url.pathname.endsWith(".css"))) {
    event.respondWith(fetch(request, { cache: "no-store" }).then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); return response; }).catch(() => caches.match(request).then(hit => hit || caches.match("./index.html"))));
    return;
  }
  event.respondWith(caches.match(request).then(hit => hit || fetch(request)));
});
