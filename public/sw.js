/**
 * AI HEAVEN - Progressive Web App Service Worker
 * Secure offline caching for static assets only in production.
 * In development or preview environments, self-unregisters and purges caches to prevent module hash desync.
 */

const isDev = self.location.hostname.includes('localhost') ||
              self.location.hostname.includes('run.app') ||
              self.location.hostname.includes('127.0.0.1');

if (isDev) {
  // Self-cleaning in dev/preview: unregister and purge all caches immediately
  self.addEventListener('install', () => {
    self.skipWaiting();
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.claim())
    );
  });
} else {
  const CACHE_NAME = 'ai-heaven-v3';
  const PRECACHE_ASSETS = [
    '/',
    '/favicon.svg',
    '/pwa-192x192.png',
    '/pwa-512x512.png',
    '/apple-touch-icon.png',
    '/manifest.json'
  ];

  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      }).then(() => self.skipWaiting())
    );
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      }).then(() => self.clients.claim())
    );
  });

  self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // Never intercept non-GET or API requests
    if (event.request.method !== 'GET') return;
    if (requestUrl.pathname.startsWith('/api/')) return;

    // Never intercept Vite dev modules or dynamic scripts
    if (
      requestUrl.pathname.startsWith('/src/') ||
      requestUrl.pathname.startsWith('/node_modules/') ||
      requestUrl.pathname.startsWith('/@') ||
      requestUrl.search.includes('v=') ||
      requestUrl.search.includes('t=') ||
      requestUrl.search.includes('import')
    ) {
      return;
    }

    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic' &&
            (PRECACHE_ASSETS.includes(requestUrl.pathname) || requestUrl.pathname.startsWith('/assets/'))
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          return cachedResponse;
        });

        return cachedResponse || fetchPromise;
      })
    );
  });
}
