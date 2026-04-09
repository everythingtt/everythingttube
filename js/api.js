// API Interaction Layer for EverythingTTUBE

const API = {
    // Utility for headers
    getHeaders(extraHeaders = {}) {
        const headers = {
            'ngrok-skip-browser-warning': 'any',
            ...extraHeaders
        };
        const token = localStorage.getItem('ett_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    // Global fetch wrapper
    async fetch(url, options = {}) {
        options.headers = this.getHeaders(options.headers || {});
        const response = await fetch(url, options);
        if (response.status === 401) {
            this.logout();
        }
        return response;
    },

    // Auth
    async login(email, password) {
        const response = await this.fetch(`${CONFIG.AUTH_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('ett_token', data.access_token);
        }
        return data;
    },

    async register(email, username, password) {
        const response = await this.fetch(`${CONFIG.AUTH_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password })
        });
        return await response.json();
    },

    async getMe() {
        const token = localStorage.getItem('ett_token');
        if (!token) return null;
        const response = await this.fetch(`${CONFIG.AUTH_URL}/auth/me?token=${token}`);
        return await response.json();
    },

    logout() {
        localStorage.removeItem('ett_token');
        window.location.href = 'auth.html';
    },

    // Videos
    async listVideos() {
        const response = await this.fetch(`${CONFIG.API_URL}/video/list`);
        return await response.json();
    },

    async searchVideos(query) {
        const response = await this.fetch(`${CONFIG.API_URL}/video/search?q=${encodeURIComponent(query)}`);
        return await response.json();
    },

    async uploadVideo(formData) {
        const response = await this.fetch(`${CONFIG.UPLOAD_URL}/video/upload`, {
            method: 'POST',
            body: formData
        });
        return await response.json();
    },

    async uploadSubtitles(videoId, file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await this.fetch(`${CONFIG.UPLOAD_URL}/video/upload-subtitles/${videoId}`, {
            method: 'POST',
            body: formData
        });
        return await response.json();
    },

    async getVideoStream(videoId) {
        const response = await this.fetch(`${CONFIG.API_URL}/video/stream/${videoId}`);
        return await response.json();
    },

    async getRecommendations(videoId) {
        const response = await this.fetch(`${CONFIG.API_URL}/video/recommendations/${videoId}`);
        return await response.json();
    },

    getVideoStreamUrl(videoId) {
        return `${CONFIG.STREAM_URL}/video/stream/${videoId}`;
    },

    // Studio
    async getStudioAnalytics() {
        const response = await this.fetch(`${CONFIG.API_URL}/studio/analytics`);
        return await response.json();
    },

    async getStudioVideos() {
        const response = await this.fetch(`${CONFIG.API_URL}/studio/videos`);
        return await response.json();
    },

    async getStudioVideo(videoId) {
        const response = await this.fetch(`${CONFIG.API_URL}/studio/video/${videoId}`);
        return await response.json();
    },

    async updateStudioVideo(videoId, metadata) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(metadata)) {
            if (value !== undefined) params.append(key, value);
        }
        const response = await this.fetch(`${CONFIG.API_URL}/studio/video/${videoId}/update?${params.toString()}`, {
            method: 'POST'
        });
        return await response.json();
    },

    async updateStudioThumbnail(videoId, file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await this.fetch(`${CONFIG.API_URL}/studio/video/${videoId}/thumbnail`, {
            method: 'POST',
            body: formData
        });
        return await response.json();
    },

    async deleteVideo(videoId) {
        const response = await this.fetch(`${CONFIG.API_URL}/studio/video/${videoId}`, {
            method: 'DELETE'
        });
        return await response.json();
    },

    // Tokens
    async getBalance() {
        const response = await this.fetch(`${CONFIG.API_URL}/tokens/balance`);
        return await response.json();
    },

    async earnTokens(actionType) {
        const response = await this.fetch(`${CONFIG.API_URL}/tokens/earn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 0, action_type: actionType })
        });
        return await response.json();
    },

    async getAdToWatch() {
        const response = await this.fetch(`${CONFIG.API_URL}/tokens/ad-to-watch`);
        return await response.json();
    },

    async createAd(title, content, views) {
        const response = await this.fetch(`${CONFIG.API_URL}/tokens/create-ad`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, views })
        });
        return await response.json();
    },

    async purchaseSponsorship() {
        const response = await this.fetch(`${CONFIG.API_URL}/tokens/sponsor`, {
            method: 'POST'
        });
        return await response.json();
    },

    // Moderation
    async reportVideo(videoId, reason) {
        const response = await this.fetch(`${CONFIG.ADMIN_URL}/moderation/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_id: videoId, reason: reason })
        });
        return await response.json();
    },

    async takeModAction(reportId, action) {
        const response = await this.fetch(`${CONFIG.ADMIN_URL}/moderation/admin/action/${reportId}?action=${action}`, {
            method: 'POST'
        });
        return await response.json();
    },

    async getAdminUsers() {
        const response = await this.fetch(`${CONFIG.ADMIN_URL}/moderation/admin/users`);
        return await response.json();
    },

    async updateAdminUserRole(userId, role) {
        const response = await this.fetch(`${CONFIG.ADMIN_URL}/moderation/admin/user/${userId}/role?role=${role}`, {
            method: 'POST'
        });
        return await response.json();
    },

    async adjustAdminUserTokens(userId, amount) {
        const response = await this.fetch(`${CONFIG.ADMIN_URL}/moderation/admin/user/${userId}/tokens?amount=${amount}`, {
            method: 'POST'
        });
        return await response.json();
    },

    async getAdminLogs() {
        const response = await this.fetch(`${CONFIG.ADMIN_URL}/moderation/admin/logs`);
        return await response.json();
    },

    async updateProfile(username, email, description, socialLinks) {
        const params = new URLSearchParams();
        if (username) params.append('username', username);
        if (email) params.append('email', email);
        if (description !== undefined) params.append('description', description);
        if (socialLinks !== undefined) params.append('social_links', JSON.stringify(socialLinks));

        const response = await this.fetch(`${CONFIG.AUTH_URL}/auth/update-profile?${params.toString()}`, {
            method: 'POST'
        });
        return await response.json();
    },

    async getChannel(username) {
        const response = await this.fetch(`${CONFIG.AUTH_URL}/auth/channel/${username}`);
        return await response.json();
    },

    async uploadAvatar(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await this.fetch(`${CONFIG.AUTH_URL}/auth/upload-avatar`, {
            method: 'POST',
            body: formData
        });
        return await response.json();
    },

    async uploadBanner(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await this.fetch(`${CONFIG.AUTH_URL}/auth/upload-banner`, {
            method: 'POST',
            body: formData
        });
        return await response.json();
    }
};
