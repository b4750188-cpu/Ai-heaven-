/**
 * AI HEAVEN - Progressive Web App Service Worker
 * Secure offline caching for static assets only.
 * CRITICAL SECURITY: Never caches /api/* routes, auth tokens, or private conversation data.
 */

const CACHE_NAME = 'ai-heaven-v2';
const PRECACHE_ASSETS = [
  '/',
  '/favicon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
  '/manifest.json'
];

// Install Event: Precaches static shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Cleans up obsolete caches and takes control immediately
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

// Fetch Event: Network-first for dev files, cache only for static production assets
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Never cache or intercept API routes or non-GET requests
  if (event.request.method !== 'GET') return;
  if (requestUrl.pathname.startsWith('/api/')) return;

  // CRITICAL: NEVER cache or intercept Vite dev modules, node_modules, or HMR/query-hashed files
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

  // Only handle static assets and navigation
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Cache valid static responses for precached assets or /assets/ production files
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
