/* =============================================================================
   SENS TRAIN & WELLNESS — OFFICIAL SERVICE WORKER (PWA ENGINE)
   Cache-First for Static Assets | Network-First for Navigation | Offline Support
   ============================================================================= */

const CACHE_NAME = 'sens-pwa-v13.0.2';

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './img/logo-NEGRO.png',
    './img/logo-blanco.png',
    './img/icons/icon-192.png',
    './img/icons/icon-512.png',
    './img/icons/icon-maskable-512.png',
    './img/icons/apple-touch-icon.png',
    './img/icons/icon.svg'
];

// Install: Pre-cache core app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn('[SENS SW] Pre-cache warning:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// Activate: Clean up previous caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: Strategy depending on request type
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Ignore non-GET requests or browser-extension schemes
    if (request.method !== 'GET' || !request.url.startsWith('http')) {
        return;
    }

    const url = new URL(request.url);

    // Bypass caching for Supabase / external APIs
    if (url.hostname.includes('supabase.co') || url.pathname.includes('/auth/v1/')) {
        return;
    }

    // Bypass caching for videos, Marketing Studio iframe suite, and HTTP Range requests
    if (request.headers.get('range') || url.pathname.endsWith('.mp4') || url.pathname.endsWith('.webm') || url.pathname.includes('/marketing-suites/')) {
        return;
    }

    // HTML Navigation requests: Network-First (2.5s timeout fallback to cache so reload never hangs)
    if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
        event.respondWith((async () => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 2500);
            try {
                const networkResponse = await fetch(request, { cache: 'no-cache', signal: controller.signal });
                clearTimeout(timer);
                if (networkResponse && networkResponse.status === 200) {
                    const copy = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return networkResponse;
            } catch (_) {
                clearTimeout(timer);
                return (await caches.match('./index.html')) || (await caches.match(request)) || Response.error();
            }
        })());
        return;
    }

    // Versioned JS/CSS (?v=...): Cache-First for instant 0ms reloads (cache-buster handles updates)
    if ((url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) && url.search.includes('v=')) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return networkResponse;
                });
            })
        );
        return;
    }

    // Unversioned JS/CSS/HTML: Network-First with cache fallback
    if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.html')) {
        event.respondWith(
            fetch(request, { cache: 'no-cache' })
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(request))
        );
        return;
    }
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    return cachedResponse || Response.error();
                });

            return cachedResponse || fetchPromise;
        })
    );
});
