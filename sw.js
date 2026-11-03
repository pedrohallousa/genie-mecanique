// Service Worker for Génie Mécanique L3 CM Platform
const CACHE_NAME = 'gm-l3cm-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/calculator.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('Cache prefill warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  // For navigation / HTML requests: Network-First so users always get fresh content, falling back to cache
  if (req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept') && req.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  // For static assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then(cachedRes => {
      const fetchPromise = fetch(req)
        .then(networkRes => {
          if (networkRes && networkRes.status === 200 && req.method === 'GET') {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => cachedRes);
      return cachedRes || fetchPromise;
    })
  );
});
