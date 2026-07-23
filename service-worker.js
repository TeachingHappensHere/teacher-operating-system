const CACHE = "teaching-happens-here-v24-1-lesson-builder";
const CORE = [
  "./",
  "./index.html",
  "./style.css?v=16.5.0",
  "./planning-framework-v190.css?v=22.2.0",
  "./planning-framework-v190.js?v=22.2.0",
  "./curriculum-map-v191.css?v=19.1.0",
  "./curriculum-map-v191.js?v=19.1.0",
  "./resource-center-v192.css?v=19.2.0",
  "./resource-center-v192.js?v=19.2.0",
  "./student-intelligence-v200.css?v=20.0.0",
  "./student-accommodations-v233.js?v=23.3.0",
  "./student-accommodations-v233.css?v=23.3.0",
  "./planbook-export-v232.js?v=23.3.0",
  "./planbook-export-v232.css?v=23.3.0",
  "./student-intelligence-v200.js?v=20.0.0",
  "./master-schedule-v180.js?v=18.0.0",
  "./schedule-workspace-v181.js?v=18.1.0",
  "./schedule-workspace-v181.css?v=18.1.0",
  "./daily-timeline-v182.js?v=18.2.0",
  "./daily-timeline-v182.css?v=18.2.0",
  "./app.js?v=16.5.0",
  "./dashboard-v240.js?v=24.0.0",
  "./dashboard-v240.css?v=24.0.0",
  "./lesson-builder-v241.js?v=24.1.0",
  "./lesson-builder-v241.css?v=24.1.0",
  "./tos-data.json",
  "./manifest.json",
  "./icon-192.svg",
  "./icon-512.svg",
  "./student-intelligence-v200.js?v=20.0.0",
  "./student-intelligence-v200.css?v=20.0.0",
  "./assessment-intelligence-v201.js?v=20.1.0",
  "./assessment-intelligence-v201.css?v=20.1.0",
  "./subject-planner-v210.js?v=23.2.0",
  "./subject-planner-v210.css?v=23.2.0",
  "./classroom-display-v211.js?v=23.0.0",
  "./classroom-display-v211.css?v=23.0.0"
];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE))); self.skipWaiting(); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => key === CACHE ? null : caches.delete(key))))); self.clients.claim(); });
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const fresh = url.pathname.endsWith("/index.html") || url.pathname.endsWith("/tos-data.json") || url.pathname.endsWith("/");
  if (fresh) {
    event.respondWith(fetch(event.request,{cache:"no-store"}).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;}).catch(()=>caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;})));
});
