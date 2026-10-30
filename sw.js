/* =============================================================================
   SENS TRAIN & WELLNESS — OFFICIAL SERVICE WORKER (PWA ENGINE)
   Cache-First for Static Assets | Network-First for Navigation | Offline Support
   ============================================================================= */

const CACHE_NAME = 'sens-pwa-v4.9.0';

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './style.css',
    './marketing_templates_catalog.js',
    './app.js',
    './nutrition_db.js',
    './exercises_db.js',
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

    // Bypass caching for videos and HTTP Range requests (prevents 206 Partial Content Cache API errors and video playback hangs)
    if (request.headers.get('range') || url.pathname.endsWith('.mp4') || url.pathname.endsWith('.webm')) {
        return;
    }

    // HTML Navigation requests: Network-First with Cache fallback (ensures fresh app shell)
    if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    return caches.match('./index.html') || caches.match(request);
                })
        );
        return;
    }

    // Static Assets (CSS, JS, Fonts, Images): Stale-While-Revalidate
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
                .catch((err) => {
                    // Fallback silently if offline
                    return null;
                });

            return cachedResponse || fetchPromise;
        })
    );
});
