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

    // Auth
    async login(email, password) {
        const response = await fetch(`${CONFIG.AUTH_URL}/auth/login`, {
            method: 'POST',
            headers: this.getHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('ett_token', data.access_token);
        }
        return data;
    },

    async register(email, username, password) {
        const response = await fetch(`${CONFIG.AUTH_URL}/auth/register`, {
            method: 'POST',
            headers: this.getHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ email, username, password })
        });
        return await response.json();
    },

    async getMe() {
        const token = localStorage.getItem('ett_token');
        if (!token) return null;
        const response = await fetch(`${CONFIG.AUTH_URL}/auth/me?token=${token}`, {
            headers: this.getHeaders()
        });
        return await response.json();
    },

    logout() {
        localStorage.removeItem('ett_token');
        window.location.href = 'auth.html';
    },

    // Videos
    async listVideos() {
        const response = await fetch(`${CONFIG.API_URL}/video/list`, {
            headers: this.getHeaders()
        });
        return await response.json();
    },

    async searchVideos(query) {
        const response = await fetch(`${CONFIG.API_URL}/video/search?q=${encodeURIComponent(query)}`, {
            headers: this.getHeaders()
        });
        return await response.json();
    },

    async uploadVideo(formData) {
        const response = await fetch(`${CONFIG.UPLOAD_URL}/video/upload`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: formData
        });
        return await response.json();
    },

    async uploadSubtitles(videoId, file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${CONFIG.UPLOAD_URL}/video/upload-subtitles/${videoId}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: formData
        });
        return await response.json();
    },

    getVideoStreamUrl(videoId) {
        return `${CONFIG.STREAM_URL}/video/stream/${videoId}`;
    },

    // Studio
    async getStudioAnalytics() {
        const response = await fetch(`${CONFIG.API_URL}/studio/analytics`, {
            headers: this.getHeaders()
        });
        return await response.json();
    },

    async getStudioVideos() {
        const response = await fetch(`${CONFIG.API_URL}/studio/videos`, {
            headers: this.getHeaders()
        });
        return await response.json();
    },

    async getStudioVideo(videoId) {
        const response = await fetch(`${CONFIG.API_URL}/studio/video/${videoId}`, {
            headers: this.getHeaders()
        });
        return await response.json();
    },

    async updateStudioVideo(videoId, metadata) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(metadata)) {
            if (value !== undefined) params.append(key, value);
        }
        const response = await fetch(`${CONFIG.API_URL}/studio/video/${videoId}/update?${params.toString()}`, {
            method: 'POST',
            headers: this.getHeaders()
        });
        return await response.json();
    },

    async updateStudioThumbnail(videoId, file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${CONFIG.API_URL}/studio/video/${videoId}/thumbnail`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: formData
        });
        return await response.json();
    },

    async deleteVideo(videoId) {
        const response = await fetch(`${CONFIG.API_URL}/studio/video/${videoId}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return await response.json();
    },

    // Tokens
    async getBalance() {
        const response = await fetch(`${CONFIG.API_URL}/tokens/balance`, {
            headers: this.getHeaders()
        });
        return await response.json();
    },

    async earnTokens(actionType) {
        const response = await fetch(`${CONFIG.API_URL}/tokens/earn`, {
            method: 'POST',
            headers: this.getHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ amount: 0, action_type: actionType })
        });
        return await response.json();
    },

    async getAdToWatch() {
        const response = await fetch(`${CONFIG.API_URL}/tokens/ad-to-watch`, {
            headers: this.getHeaders()
        });
        return await response.json();
    },

    async createAd(title, content, views) {
        const response = await fetch(`${CONFIG.API_URL}/tokens/create-ad`, {
            method: 'POST',
            headers: this.getHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ title, content, views })
        });
        return await response.json();
    },

    async purchaseSponsorship() {
        const response = await fetch(`${CONFIG.API_URL}/tokens/sponsor`, {
            method: 'POST',
            headers: this.getHeaders()
        });
        return await response.json();
    },

    // Moderation
    async reportVideo(videoId, reason) {
        const response = await fetch(`${CONFIG.ADMIN_URL}/moderation/report`, {
            method: 'POST',
            headers: this.getHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ video_id: videoId, reason: reason })
        });
        return await response.json();
    },

    async takeModAction(reportId, action) {
        const response = await fetch(`${CONFIG.ADMIN_URL}/moderation/admin/action/${reportId}?action=${action}`, {
            method: 'POST',
            headers: this.getHeaders()
        });
        return await response.json();
    },

    async getAdminUsers() {
        const response = await fetch(`${CONFIG.ADMIN_URL}/moderation/admin/users`, {
            headers: this.getHeaders()
        });
        return await response.json();
    },

    async updateAdminUserRole(userId, role) {
        const response = await fetch(`${CONFIG.ADMIN_URL}/moderation/admin/user/${userId}/role?role=${role}`, {
            method: 'POST',
            headers: this.getHeaders()
        });
        return await response.json();
    },

    async adjustAdminUserTokens(userId, amount) {
        const response = await fetch(`${CONFIG.ADMIN_URL}/moderation/admin/user/${userId}/tokens?amount=${amount}`, {
            method: 'POST',
            headers: this.getHeaders()
        });
        return await response.json();
    },

    async getAdminLogs() {
        const response = await fetch(`${CONFIG.ADMIN_URL}/moderation/admin/logs`, {
            headers: this.getHeaders()
        });
        return await response.json();
    },

    async updateProfile(username, email, description, socialLinks) {
        const params = new URLSearchParams();
        if (username) params.append('username', username);
        if (email) params.append('email', email);
        if (description !== undefined) params.append('description', description);
        if (socialLinks !== undefined) params.append('social_links', JSON.stringify(socialLinks));

        const response = await fetch(`${CONFIG.AUTH_URL}/auth/update-profile?${params.toString()}`, {
            method: 'POST',
            headers: this.getHeaders()
        });
        return await response.json();
    },

    async getChannel(username) {
        const response = await fetch(`${CONFIG.AUTH_URL}/auth/channel/${username}`, {
            headers: this.getHeaders()
        });
        return await response.json();
    },

    async uploadAvatar(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${CONFIG.AUTH_URL}/auth/upload-avatar`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: formData
        });
        return await response.json();
    },

    async uploadBanner(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${CONFIG.AUTH_URL}/auth/upload-banner`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: formData
        });
        return await response.json();
    }
};
