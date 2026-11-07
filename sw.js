const CACHE_NAME = 'matrix-finance-v71';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './apps_script.gs',
  './css/matrix.css',
  './icons/oracle-cookie.jpg',
  './icons/matrix-icon.svg',
  './icons/matrix-icon-192.png',
  './icons/matrix-icon-512.png',
  './icons/matrix-icon.png',
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
  if (event.request.method !== 'GET') return;

  // NUNCA interceptar chamadas externas (como Google Apps Script / Google Sheets / APIs)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || Response.error();
        });
      })
  );
});
