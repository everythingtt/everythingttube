const DEFAULT_CONFIG = {
    API_URL: "http://localhost:8081",
    AUTH_URL: "http://localhost:8082",
    STREAM_URL: "http://localhost:8083",
    UPLOAD_URL: "http://localhost:8084",
    ADMIN_URL: "http://localhost:8085"
};

// Global config object that will be updated
let CONFIG = { ...DEFAULT_CONFIG };

// Tracks which URLs are "live"
let ENDPOINT_STATUS = {
    api: 'unknown',
    auth: 'unknown',
    stream: 'unknown',
    upload: 'unknown',
    admin: 'unknown'
};

// Load overrides from localStorage
function loadLocalOverrides() {
    // Only apply if they don't look like localhost (unless we are on localhost)
    const isLocalPage = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    const storedApi = localStorage.getItem('ett_api_url');
    const storedAuth = localStorage.getItem('ett_auth_url');
    
    if (storedApi && (isLocalPage || !storedApi.includes('localhost'))) CONFIG.API_URL = storedApi;
    if (storedAuth && (isLocalPage || !storedAuth.includes('localhost'))) CONFIG.AUTH_URL = storedAuth;
    
    CONFIG.STREAM_URL = localStorage.getItem('ett_stream_url') || CONFIG.STREAM_URL;
    CONFIG.UPLOAD_URL = localStorage.getItem('ett_upload_url') || CONFIG.UPLOAD_URL;
    CONFIG.ADMIN_URL = localStorage.getItem('ett_admin_url') || CONFIG.ADMIN_URL;
}

// Automatic Discovery: Fetch latest URLs from discovery.json (GitHub Pages origin)
async function autoDiscoverEndpoints() {
    try {
        console.log("Discovering endpoints...");
        // Use a cache-busting parameter to avoid old URLs
        const cacheBuster = `?t=${new Date().getTime()}`;
        const GITHUB_DISCOVERY_URL = `https://raw.githubusercontent.com/everythingtt/everythingttube/refs/heads/main/discovery.json${cacheBuster}`;
        
        let response = await fetch(GITHUB_DISCOVERY_URL);
        
        // Fallback to local discovery.json if GitHub is unavailable
        if (!response.ok) {
            console.warn("GitHub discovery failed, falling back to local discovery.json");
            response = await fetch(`discovery.json${cacheBuster}`);
        }

        if (response.ok) {
            const remoteConfig = await response.json();
            if (remoteConfig.api) CONFIG.API_URL = remoteConfig.api;
            if (remoteConfig.auth) CONFIG.AUTH_URL = remoteConfig.auth;
            if (remoteConfig.video_stream) CONFIG.STREAM_URL = remoteConfig.video_stream;
            if (remoteConfig.upload) CONFIG.UPLOAD_URL = remoteConfig.upload;
            if (remoteConfig.admin) CONFIG.ADMIN_URL = remoteConfig.admin;
            console.log("Automatic discovery successful:", CONFIG);
        } else {
            console.warn("Could not find discovery.json in any location.");
        }
    } catch (e) {
        console.warn("Discovery error, using defaults/overrides:", e);
    }
    
    // Still apply manual overrides if any (they take precedence)
    loadLocalOverrides();
    
    // Check health of discovered endpoints (non-blocking)
    checkEndpointsHealth();
}

async function checkEndpointsHealth() {
    const check = async (service, url) => {
        // Skip if recently checked and online
        const lastCheck = localStorage.getItem(`last_check_${service}`);
        if (lastCheck && (Date.now() - parseInt(lastCheck)) < 60000 && ENDPOINT_STATUS[service] === 'online') {
            return;
        }

        try {
            // Use a small timeout to avoid long waits
             const controller = new AbortController();
             const id = setTimeout(() => controller.abort(), 10000); // 10s timeout
             
             // Use bypass query param for health check
             const bypassUrl = new URL(url + "/");
             bypassUrl.searchParams.set('ngrok-skip-browser-warning', 'any');

             const response = await fetch(bypassUrl.toString(), { 
                 method: 'GET', 
                 signal: controller.signal,
                 headers: { 'ngrok-skip-browser-warning': 'any' }
             });
            clearTimeout(id);
            
            if (response.ok) {
                ENDPOINT_STATUS[service] = 'online';
                localStorage.setItem(`last_check_${service}`, Date.now().toString());
                console.log(`Endpoint ${service} (${url}) is ONLINE`);
            } else {
                ENDPOINT_STATUS[service] = 'error';
                console.warn(`Endpoint ${service} (${url}) returned error ${response.status}`);
            }
        } catch (e) {
            ENDPOINT_STATUS[service] = 'offline';
            console.warn(`Endpoint ${service} (${url}) is OFFLINE:`, e.message);
            
            // If ngrok fails, and we are on localhost, maybe we should auto-fallback to localhost ports?
            if (url.includes('ngrok-free.dev') && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                 console.info(`Auto-fallback to localhost for ${service}...`);
                 const defaultUrl = DEFAULT_CONFIG[service.toUpperCase() + '_URL'];
                 if (defaultUrl) {
                     CONFIG[service === 'video_stream' ? 'STREAM_URL' : (service.toUpperCase() + '_URL')] = defaultUrl;
                 }
             }
        }
    };

    // Check sequentially to avoid hitting ngrok concurrency limits
    await check('api', CONFIG.API_URL);
    await check('auth', CONFIG.AUTH_URL);
    await check('stream', CONFIG.STREAM_URL);
    await check('upload', CONFIG.UPLOAD_URL);
    await check('admin', CONFIG.ADMIN_URL);
}

// Initialize config
loadLocalOverrides();

// Return a promise that resolves when discovery is complete
const DISCOVERY_PROMISE = autoDiscoverEndpoints();

// Register Service Worker for Ngrok Warning Bypass
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => {
                console.log('EverythingTTUBE Service Worker registered');
                // Check if the SW is already controlling the page
                if (!navigator.serviceWorker.controller) {
                    // Reload if it's the first time to ensure interception
                    // location.reload(); 
                }
            })
            .catch(err => console.warn('Service Worker registration failed:', err));
    });
}

function updateNetworkConfig(newConfig) {
    if (newConfig.api) localStorage.setItem('ett_api_url', newConfig.api);
    if (newConfig.auth) localStorage.setItem('ett_auth_url', newConfig.auth);
    if (newConfig.stream) localStorage.setItem('ett_stream_url', newConfig.stream);
    if (newConfig.upload) localStorage.setItem('ett_upload_url', newConfig.upload);
    if (newConfig.admin) localStorage.setItem('ett_admin_url', newConfig.admin);
    location.reload();
}
