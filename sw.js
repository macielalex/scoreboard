/**
 * Service Worker — app-shell com atualização automática
 * HTML/JS/CSS: network-first (rede ao abrir; cache só offline).
 * Ícones e estáticos: cache-first.
 * Incremente CACHE_NAME a cada deploy para limpar caches antigos.
 */
var CACHE_NAME = 'scoreboard-v3';

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

var NETWORK_FIRST_PATHS = ['/', '/index.html', '/app.js', '/styles.css'];

function isNetworkFirst(url) {
  return NETWORK_FIRST_PATHS.indexOf(url.pathname) !== -1;
}

function putInCache(request, response) {
  if (!response || response.status !== 200 || response.type !== 'basic') return;
  var clone = response.clone();
  caches.open(CACHE_NAME).then(function (cache) {
    cache.put(request, clone);
  });
}

function networkFirst(request) {
  return fetch(request).then(function (response) {
    putInCache(request, response);
    return response;
  }).catch(function () {
    return caches.match(request);
  });
}

function cacheFirst(request) {
  return caches.match(request).then(function (cached) {
    if (cached) return cached;

    return fetch(request).then(function (response) {
      putInCache(request, response);
      return response;
    });
  });
}

function offlineFallback() {
  return caches.match('/index.html').then(function (cached) {
    return cached || caches.match('/offline.html');
  });
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

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

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate' || isNetworkFirst(url)) {
    event.respondWith(
      networkFirst(event.request).then(function (response) {
        if (response) return response;
        return offlineFallback();
      }).catch(function () {
        return offlineFallback();
      })
    );
    return;
  }

  event.respondWith(
    cacheFirst(event.request).catch(function () {
      if (event.request.mode === 'navigate') {
        return offlineFallback();
      }
    })
  );
});
