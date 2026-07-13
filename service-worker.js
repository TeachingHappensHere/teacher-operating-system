
const CACHE_NAME="teaching-happens-here-v59-notifications-reminders";
const ASSETS=["./","./index.html","./style.css","./app.js","./manifest.json","./school-calendar-v5-8.js","./school-calendar-v5-8.json","./notifications-reminders-v5-9.js","./notifications-reminders-v5-9.json","./style-additions-v5-8.css","./style-additions-v5-9.css"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>Promise.all(ASSETS.map(a=>c.add(a).catch(()=>null)))));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME?caches.delete(k):null))));self.clients.claim()});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)))});
