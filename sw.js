// EverythingTTUBE Service Worker
// Intercepts requests to ngrok tunnels and adds bypass headers

const BYPASS_HEADER = 'ngrok-skip-browser-warning';
const BYPASS_VALUE = 'any';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Skip non-GET requests for the simple bypass to avoid breaking POST/uploads
    if (event.request.method !== 'GET') return;

    let url = new URL(event.request.url);
    
    // 1. Force Ngrok Bypass for all GET requests to ngrok tunnels
    if (url.hostname.endsWith('.ngrok-free.dev')) {
        // Only modify if it doesn't already have the bypass param
        if (!url.searchParams.has(BYPASS_HEADER)) {
            url.searchParams.set(BYPASS_HEADER, BYPASS_VALUE);
            
            // Redirect the request to the new URL with the query param
            // This is safer than modifying headers which triggers CORS preflights
            event.respondWith(
                fetch(url.toString(), {
                    mode: 'cors',
                    credentials: event.request.credentials || 'include'
                })
            );
            return;
        }
    }
});
