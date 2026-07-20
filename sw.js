
const CACHE_NAME = 'nicolas-trainer-v7-12';
const LOCAL_ASSETS = [
  './',
  './index.html',
  './aluno.html',
  './manifest.webmanifest',
  './app-icon.svg',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
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

  // Personaliza o manifest.webmanifest quando pedido com ?code=XXXX na URL.
  // Isso substitui a técnica antiga de blob: URL, que o "Adicionar à Tela de
  // Início" do iOS não consegue ler (ele busca o manifest pela rede/SW, e
  // blob: só existe dentro da memória da própria aba). Como esta é uma URL
  // https normal, o iOS consegue buscá-la de verdade através deste SW.
  if (isLocal && url.pathname.endsWith('/manifest.webmanifest') && url.searchParams.has('code')) {
    const code = url.searchParams.get('code');
    event.respondWith(
      fetch('./manifest.webmanifest').then(r => r.json()).then(manifest => {
        const personalizedUrl = `./index.html?app=aluno&code=${encodeURIComponent(code)}`;
        manifest.start_url = personalizedUrl;
        manifest.id = personalizedUrl;
        manifest.short_name = 'Meu Treino';
        return new Response(JSON.stringify(manifest), {
          headers: { 'Content-Type': 'application/manifest+json' }
        });
      }).catch(() => fetch(event.request))
    );
    return;
  }

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