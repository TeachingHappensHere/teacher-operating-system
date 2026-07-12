
const CACHE_NAME="teaching-happens-here-v53-weekly-planner";
const ASSETS=[
"./","./index.html","./style.css","./app.js","./manifest.json",
"./instructional-content-v5-1.js","./instructional-content-v5-1.json",
"./curriculum-resource-integration-v5-2.js","./curriculum-resource-integration-v5-2.json",
"./weekly-planner-v5-3.js","./weekly-planner-v5-3.json",
"./style-additions-v5-1.css","./style-additions-v5-2.css","./style-additions-v5-3.css"
];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>Promise.all(ASSETS.map(a=>c.add(a).catch(()=>null)))));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME?caches.delete(k):null))));self.clients.claim()});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)))});
