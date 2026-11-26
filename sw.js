/* =============================================================================
   SENS TRAIN & WELLNESS — OFFICIAL SERVICE WORKER (PWA ENGINE v14)
   Zero-Stale Architecture: Native HTTP for versioned assets, Network-First HTML
   ============================================================================= */

const CACHE_NAME = 'sens-pwa-v24.25.0';

// Install: activate immediately without stale precaching of HTML/JS/CSS
self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

// Activate: purge ALL legacy caches immediately so updates are 100% clean
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

// Fetch: Only intercept HTML navigation for offline fallback; let versioned JS/CSS/media use native HTTP cache
self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET' || !request.url.startsWith('http')) {
        return;
    }

    const url = new URL(request.url);
    if (url.hostname.includes('supabase.co') || url.pathname.includes('/auth/v1/')) {
        return;
    }

    // Only intercept top-level HTML navigation requests
    if (request.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const networkResponse = await fetch(request, { cache: 'no-store' });
                if (networkResponse && networkResponse.status === 200) {
                    const copy = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
                }
                return networkResponse;
            } catch (_) {
                return (await caches.match('./index.html')) || Response.error();
            }
        })());
    }
});
