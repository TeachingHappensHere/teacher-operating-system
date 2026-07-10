const CACHE_NAME='teaching-happens-here-v36-assessment-data';
const ASSETS=['./','./index.html','./style.css','./app.js','./scholar-dashboard.json','./lesson-engine.json','./classroom-systems.json','./teach-my-day.json','./classroom-launch.json','./print-center.json','./teacher-brain.json','./small-groups.json','./assessment-data.json','./manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME?caches.delete(k):null))));self.clients.claim();});
self.addEventListener('fetch',e=>{e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));});