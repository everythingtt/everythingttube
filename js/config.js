const DEFAULT_CONFIG = {
    API_URL: "http://localhost:8081",
    AUTH_URL: "http://localhost:8082",
    STREAM_URL: "http://localhost:8083",
    UPLOAD_URL: "http://localhost:8084",
    ADMIN_URL: "http://localhost:8085"
};

// --- Smart Configuration Initialization ---
const IS_PRODUCTION = window.location.hostname.includes('github.io');
let CONFIG = { ...DEFAULT_CONFIG };

// If on GitHub Pages, wipe localhost defaults immediately to avoid useless preflights/errors
// This forces the app to wait for Discovery or manual input.
if (IS_PRODUCTION) {
    Object.keys(CONFIG).forEach(key => CONFIG[key] = "");
}

// --- Console Log Interception for Mobile Feedback ---
const LOG_STORAGE_KEY = 'ttube_client_logs';
const MAX_LOGS = 100;

// Initialize or clear logs if session is fresh
if (!sessionStorage.getItem('session_active')) {
    sessionStorage.setItem(LOG_STORAGE_KEY, JSON.stringify([]));
    sessionStorage.setItem('session_active', 'true');
}

function captureLog(type, args) {
    try {
        let logs = JSON.parse(sessionStorage.getItem(LOG_STORAGE_KEY) || "[]");
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        logs.push({
            type,
            message,
            timestamp: new Date().toLocaleTimeString(),
            location: window.location.pathname.split('/').pop() || 'index.html'
        });
        if (logs.length > MAX_LOGS) logs.shift();
        sessionStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
    } catch (e) { /* silent fail */ }
}

// Intercept original console methods
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
const originalInfo = console.info;

console.log = (...args) => { captureLog('log', args); originalLog.apply(console, args); };
console.warn = (...args) => { captureLog('warn', args); originalWarn.apply(console, args); };
console.error = (...args) => { captureLog('error', args); originalError.apply(console, args); };
console.info = (...args) => { captureLog('info', args); originalInfo.apply(console, args); };

// --- End Console Interception ---

// Global config object that will be updated (initialized above)

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
    const discoveryUrls = [
        `https://raw.githubusercontent.com/everythingtt/everythingttube/refs/heads/main/discovery.json?t=${Date.now()}`,
        `discovery.json?t=${Date.now()}`
    ];

    let found = false;
    for (const url of discoveryUrls) {
        try {
            console.log(`%c[DISCOVERY] Attempting to fetch endpoints from ${url}...`, "color: #3498db; font-weight: bold;");
            const response = await fetch(url);
            if (response.ok) {
                const remoteConfig = await response.json();
                
                // CRITICAL: Validate that we didn't just fetch "localhost" from GitHub
                // This can happen if the dev accidentally pushed local config.
                if (remoteConfig.api && remoteConfig.api.includes('localhost') && IS_PRODUCTION) {
                    console.warn("%c[DISCOVERY] GitHub returned localhost URLs. Ignoring to avoid CORS errors.", "color: #f39c12;");
                    continue; 
                }

                if (remoteConfig.api) CONFIG.API_URL = remoteConfig.api;
                if (remoteConfig.auth) CONFIG.AUTH_URL = remoteConfig.auth;
                if (remoteConfig.video_stream) CONFIG.STREAM_URL = remoteConfig.video_stream;
                if (remoteConfig.upload) CONFIG.UPLOAD_URL = remoteConfig.upload;
                if (remoteConfig.admin) CONFIG.ADMIN_URL = remoteConfig.admin;
                
                console.log("%c[DISCOVERY] SUCCESS: Tunnels synchronized with GitHub.", "color: #2ecc71; font-weight: bold;");
                found = true;
                break; // Exit loop on success
            }
        } catch (e) {
            console.warn(`%c[DISCOVERY] ERROR: Failed to reach discovery endpoint ${url}: ${e.message}`, "color: #f39c12;");
        }
    }
    
    if (!found && IS_PRODUCTION) {
        console.error("%c[DISCOVERY] FAILED: All discovery methods exhausted. Platform may be offline.", "color: #e74c3c; font-weight: bold;");
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
             // IMPORTANT: We do NOT send custom headers here to avoid CORS preflight (OPTIONS)
             // which is the most common cause of "Endpoint is OFFLINE" for external users.
             const bypassUrl = new URL(url + "/");
             bypassUrl.searchParams.set('ngrok-skip-browser-warning', 'any');

             const response = await fetch(bypassUrl.toString(), { 
                 method: 'GET', 
                 mode: 'cors',
                 signal: controller.signal
             });
            clearTimeout(id);
            
            if (response.ok) {
                ENDPOINT_STATUS[service] = 'online';
                localStorage.setItem(`last_check_${service}`, Date.now().toString());
                console.log(`%c[NETWORK] ${service.toUpperCase()} is ONLINE`, "color: #00ff00; font-weight: bold;");
            } else {
                ENDPOINT_STATUS[service] = 'error';
                console.warn(`%c[NETWORK] ${service.toUpperCase()} returned error ${response.status}`, "color: #ffa500;");
            }
        } catch (e) {
            ENDPOINT_STATUS[service] = 'offline';
            console.error(`%c[NETWORK] ${service.toUpperCase()} is OFFLINE: ${e.message}`, "color: #ff0000;");
            
            // Helpful tip for external users
            if (window.location.hostname.includes('github.io')) {
                console.info("%c[TIP] If you see CORS errors, it means the developer's PC is currently unreachable or Nginx is down.", "color: #888; font-style: italic;");
            }
            
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
