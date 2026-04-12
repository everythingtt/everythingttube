// EverythingTTUBE Advanced Service Worker
// Optimized for: Ngrok Bypass, Aggressive Asset Caching, and Offline Fallback

const BYPASS_HEADER = 'ngrok-skip-browser-warning';
const BYPASS_VALUE = 'any';
const CACHE_NAME = 'ttube-v1';

// Assets to cache immediately on install
// Use relative paths to handle GitHub sub-directory hosting (/everythingttube/)
const PRECACHE_ASSETS = [
    'index.html',
    'watch.html',
    'studio.html',
    'upload.html',
    'history.html',
    'network.html',
    'console.html',
    'css/style.css',
    'js/config.js',
    'js/api.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/hls.js@latest'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) return caches.delete(name);
                })
            );
        }).then(() => clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const isNgrok = url.hostname.endsWith('.ngrok-free.dev');

    // 1. Ngrok Bypass Strategy (Query Param Injection)
    if (isNgrok && event.request.method === 'GET') {
        if (!url.searchParams.has(BYPASS_HEADER)) {
            url.searchParams.set(BYPASS_HEADER, BYPASS_VALUE);
            
            event.respondWith(
                fetch(url.toString(), {
                    mode: 'cors',
                    credentials: event.request.credentials || 'include'
                }).catch(async () => {
                    // Offline fallback for ngrok requests (e.g. cached thumbnails)
                    const cachedResponse = await caches.match(event.request);
                    return cachedResponse || new Response('Offline', { status: 503 });
                })
            );
            return;
        }
    }

    // 2. Cache-First Strategy for static assets and CDN files
    if (PRECACHE_ASSETS.some(asset => event.request.url.includes(asset)) || 
        url.pathname.match(/\.(js|css|png|jpg|jpeg|webp|woff2|svg)$/)) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request).then((fetchRes) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        // Don't cache ngrok video segments or large files here
                        if (!isNgrok) cache.put(event.request, fetchRes.clone());
                        return fetchRes;
                    });
                });
            })
        );
        return;
    }

    // 3. Network-Only (Default) for API calls and POST requests
});
