const CACHE_NAME = "evolve-app-v2";
const assetsToCache = [
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json"
  "./icon-192.png",
  "./icon-512.png"
];

// Install the service worker and cache files
self.addEventListener("install", installEvent => {
  installEvent.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assetsToCache);
    })
  );
});

// Fetch files from cache when offline
self.addEventListener("fetch", fetchEvent => {
  fetchEvent.respondWith(
    caches.match(fetchEvent.request).then(res => {
      return res || fetch(fetchEvent.request);
    })
  );
});
