
const CACHE_NAME="teaching-happens-here-rc1";
const ASSETS=[
"./","./index.html","./style.css","./app.js","./manifest.json",
"./release-candidate-rc1.js","./release-candidate-rc1.json","./style-additions-rc1.css",
"./classroom-launch-v6-0.js","./classroom-launch-v6-0.json","./style-additions-v6-0.css",
"./instructional-content-v5-1.js","./instructional-content-v5-1.json",
"./curriculum-resource-integration-v5-2.js","./curriculum-resource-integration-v5-2.json",
"./weekly-planner-v5-3.js","./weekly-planner-v5-3.json",
"./assessment-reteach-v5-4.js","./assessment-reteach-v5-4.json",
"./student-support-family-v5-5.js","./student-support-family-v5-5.json",
"./standards-reporting-v5-6.js","./standards-reporting-v5-6.json",
"./daily-command-center-v5-7.js","./daily-command-center-v5-7.json",
"./school-calendar-v5-8.js","./school-calendar-v5-8.json",
"./notifications-reminders-v5-9.js","./notifications-reminders-v5-9.json"
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
