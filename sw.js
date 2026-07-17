
const CACHE_NAME = 'nicolas-trainer-v7-9';
const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './app-icon.svg',
  './exercise-media-catalog.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(LOCAL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isLocal = url.origin === location.origin;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache válidas só para recursos locais
        if (response && response.ok && isLocal) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback de navegação para o shell principal
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./');
          }
          return Response.error();
        })
      )
  );
});