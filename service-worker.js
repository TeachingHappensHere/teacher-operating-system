const CACHE_NAME='teaching-happens-here-v43-resource-library-viewer';
const ASSETS=['./','./index.html','./style.css','./style-additions-v4-2.css','./style-additions-v4-3.css','./app.js','./resource-files-viewer.js','./resource-files.json','./manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME?caches.delete(k):null))));self.clients.claim();});
self.addEventListener('fetch',e=>{e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));});