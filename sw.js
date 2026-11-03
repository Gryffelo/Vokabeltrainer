// Vokabeltrainer PWA – Service Worker
// Bei jeder App-Version die Cache-Version erhöhen.
const CACHE_NAME = 'vokabeltrainer-pwa-v1.1';
const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith('vokabeltrainer-pwa-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// HTML frisch vom Server laden, offline aus dem Cache bereitstellen.
// Andere App-Dateien werden cache-first geladen.
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  const isHtml = req.mode === 'navigate' || url.pathname.endsWith('.html');

  if (isHtml) {
    event.respondWith(
      fetch(req)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
          return response;
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return response;
      });
    })
  );
});

// Kompatibel mit dem Aktualisieren-Button der index.html.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
