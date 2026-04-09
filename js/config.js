const DEFAULT_CONFIG = {
    API_URL: "http://localhost:8081",
    AUTH_URL: "http://localhost:8082",
    STREAM_URL: "http://localhost:8083",
    UPLOAD_URL: "http://localhost:8084",
    ADMIN_URL: "http://localhost:8085"
};

// Global config object that will be updated
let CONFIG = { ...DEFAULT_CONFIG };

// Load overrides from localStorage
function loadLocalOverrides() {
    CONFIG.API_URL = localStorage.getItem('ett_api_url') || CONFIG.API_URL;
    CONFIG.AUTH_URL = localStorage.getItem('ett_auth_url') || CONFIG.AUTH_URL;
    CONFIG.STREAM_URL = localStorage.getItem('ett_stream_url') || CONFIG.STREAM_URL;
    CONFIG.UPLOAD_URL = localStorage.getItem('ett_upload_url') || CONFIG.UPLOAD_URL;
    CONFIG.ADMIN_URL = localStorage.getItem('ett_admin_url') || CONFIG.ADMIN_URL;
}

// Automatic Discovery: Fetch latest URLs from discovery.json (GitHub Pages origin)
async function autoDiscoverEndpoints() {
    try {
        // Fetch from the same origin as the frontend
        const response = await fetch('discovery.json', { cache: 'no-store' });
        if (response.ok) {
            const remoteConfig = await response.json();
            if (remoteConfig.api) CONFIG.API_URL = remoteConfig.api;
            if (remoteConfig.auth) CONFIG.AUTH_URL = remoteConfig.auth;
            if (remoteConfig.video_stream) CONFIG.STREAM_URL = remoteConfig.video_stream;
            if (remoteConfig.upload) CONFIG.UPLOAD_URL = remoteConfig.upload;
            if (remoteConfig.admin) CONFIG.ADMIN_URL = remoteConfig.admin;
            console.log("Automatic discovery successful:", CONFIG);
        }
    } catch (e) {
        console.warn("Automatic discovery failed, falling back to defaults/overrides:", e);
    }
    // Still apply manual overrides if any (they take precedence)
    loadLocalOverrides();
}

// Initialize config
loadLocalOverrides();
// Trigger discovery but don't block (UI will use best available URLs)
autoDiscoverEndpoints();

function getServiceUrl(service) {
    switch (service) {
        case 'api': return CONFIG.API_URL;
        case 'auth': return CONFIG.AUTH_URL;
        case 'stream': return CONFIG.STREAM_URL;
        case 'upload': return CONFIG.UPLOAD_URL;
        case 'admin': return CONFIG.ADMIN_URL;
        default: return CONFIG.API_URL;
    }
}

function updateNetworkConfig(newConfig) {
    if (newConfig.api) localStorage.setItem('ett_api_url', newConfig.api);
    if (newConfig.auth) localStorage.setItem('ett_auth_url', newConfig.auth);
    if (newConfig.stream) localStorage.setItem('ett_stream_url', newConfig.stream);
    if (newConfig.upload) localStorage.setItem('ett_upload_url', newConfig.upload);
    if (newConfig.admin) localStorage.setItem('ett_admin_url', newConfig.admin);
    location.reload();
}
