/**
 * Service Worker — estratégia app-shell
 * Cache-first para assets estáticos; fallback para offline.html em navegação sem rede.
 * Incremente CACHE_NAME a cada deploy para invalidar caches antigos.
 */
var CACHE_NAME = 'scoreboard-v1';

var PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png'
];

/* Instalação: pré-cache dos assets do app-shell */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* Ativação: remove caches de versões anteriores */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* Fetch: cache-first para GET; navegação offline cai em offline.html */
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);

  /* Ignora requisições de outros domínios (CDN de confetti/qrcode) */
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;

      return fetch(event.request).then(function (response) {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, clone);
        });

        return response;
      }).catch(function () {
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        return undefined;
      });
    })
  );
});
