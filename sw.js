const CACHE_NAME = 'matrix-finance-v19';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/matrix.css',
  './icons/matrix-icon.svg',
  './js/seed-data.js',
  './js/matrix-rain.js',
  './js/db.js',
  './js/calendar-engine.js',
  './js/amortization-engine.js',
  './js/scenario-simulator.js',
  './js/pdf-reader.js',
  './js/satellite-connectors.js',
  './js/sync-engine.js',
  './js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Estratégia Network-First para assets do app com fallback no Cache
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
