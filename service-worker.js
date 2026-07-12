
const CACHE_NAME="teaching-happens-here-v57-daily-command-center";
const ASSETS=[
"./","./index.html","./style.css","./app.js","./manifest.json",
"./standards-reporting-v5-6.js","./standards-reporting-v5-6.json",
"./daily-command-center-v5-7.js","./daily-command-center-v5-7.json",
"./style-additions-v5-6.css","./style-additions-v5-7.css"
];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>
      Promise.all(ASSETS.map(asset=>cache.add(asset).catch(()=>null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.map(key=>key!==CACHE_NAME?caches.delete(key):null))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  event.respondWith(
    fetch(event.request)
      .then(response=>{
        const copy=response.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
        return response;
      })
      .catch(()=>caches.match(event.request))
  );
});
