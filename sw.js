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
    let url = new URL(event.request.url);
    
    // 1. Force Ngrok Bypass for all requests
    if (url.hostname.endsWith('.ngrok-free.dev')) {
        // Only modify if it doesn't already have the bypass param
        if (!url.searchParams.has(BYPASS_HEADER)) {
            url.searchParams.set(BYPASS_HEADER, BYPASS_VALUE);
            
            // We must create a new request with the updated URL
            // and keep all original headers/method/body
            event.respondWith(
                (async () => {
                    const newHeaders = new Headers(event.request.headers);
                    newHeaders.set(BYPASS_HEADER, BYPASS_VALUE);
                    
                    const requestInit = {
                        method: event.request.method,
                        headers: newHeaders,
                        mode: 'cors',
                        credentials: 'omit'
                    };
                    
                    // Body is only allowed for certain methods
                    if (!['GET', 'HEAD'].includes(event.request.method)) {
                        requestInit.body = await event.request.clone().blob();
                    }
                    
                    const modifiedRequest = new Request(url.toString(), requestInit);
                    return fetch(modifiedRequest);
                })()
            );
            return;
        }
    }
    // No further processing needed here for other requests
});
