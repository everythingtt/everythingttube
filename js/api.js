// API Interaction Layer for EverythingTTUBE

const API = {
    // Auth
    async login(email, password) {
        const response = await fetch(`${CONFIG.AUTH_URL}/auth/login`, {
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
        const response = await fetch(`${CONFIG.AUTH_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password })
        });
        return await response.json();
    },

    async getMe() {
        const token = localStorage.getItem('ett_token');
        if (!token) return null;
        const response = await fetch(`${CONFIG.AUTH_URL}/auth/me?token=${token}`);
        return await response.json();
    },

    logout() {
        localStorage.removeItem('ett_token');
        window.location.href = 'auth.html';
    },

    // Videos
    async listVideos() {
        const response = await fetch(`${CONFIG.API_URL}/video/list`);
        return await response.json();
    },

    async searchVideos(query) {
        const response = await fetch(`${CONFIG.API_URL}/video/search?q=${encodeURIComponent(query)}`);
        return await response.json();
    },

    async uploadVideo(formData) {
        const token = localStorage.getItem('ett_token');
        const response = await fetch(`${CONFIG.UPLOAD_URL}/video/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        return await response.json();
    },

    async uploadSubtitles(videoId, file) {
        const token = localStorage.getItem('ett_token');
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${CONFIG.UPLOAD_URL}/video/upload-subtitles/${videoId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        return await response.json();
    },

    getVideoStreamUrl(videoId) {
        return `${CONFIG.STREAM_URL}/video/stream/${videoId}`;
    },

    // Studio
    async getStudioAnalytics() {
        const token = localStorage.getItem('ett_token');
        const response = await fetch(`${CONFIG.API_URL}/studio/analytics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    async getStudioVideos() {
        const token = localStorage.getItem('ett_token');
        const response = await fetch(`${CONFIG.API_URL}/studio/videos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    async deleteVideo(videoId) {
        const token = localStorage.getItem('ett_token');
        const response = await fetch(`${CONFIG.API_URL}/studio/video/${videoId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    // Tokens
    async getBalance() {
        const token = localStorage.getItem('ett_token');
        const response = await fetch(`${CONFIG.API_URL}/tokens/balance`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    async earnTokens(actionType) {
        const token = localStorage.getItem('ett_token');
        const response = await fetch(`${CONFIG.API_URL}/tokens/earn`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ amount: 0, action_type: actionType })
        });
        return await response.json();
    },

    async getAdToWatch() {
        const response = await fetch(`${CONFIG.API_URL}/tokens/ad-to-watch`);
        return await response.json();
    },

    async createAd(title, content, views) {
        const token = localStorage.getItem('ett_token');
        const response = await fetch(`${CONFIG.API_URL}/tokens/create-ad`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ title, content, views })
        });
        return await response.json();
    },

    async purchaseSponsorship() {
        const token = localStorage.getItem('ett_token');
        const response = await fetch(`${CONFIG.API_URL}/tokens/sponsor`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    // Moderation
    async reportVideo(videoId, reason) {
        const token = localStorage.getItem('ett_token');
        const response = await fetch(`${CONFIG.ADMIN_URL}/moderation/report`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ video_id: videoId, reason: reason })
        });
        return await response.json();
    },

    async takeModAction(reportId, action) {
        const token = localStorage.getItem('ett_token');
        const response = await fetch(`${CONFIG.ADMIN_URL}/moderation/admin/action/${reportId}?action=${action}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    async getAdminUsers() {
        const token = localStorage.getItem('ett_token');
        const response = await fetch(`${CONFIG.ADMIN_URL}/moderation/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    async updateAdminUserRole(userId, role) {
        const token = localStorage.getItem('ett_token');
        const response = await fetch(`${CONFIG.ADMIN_URL}/moderation/admin/user/${userId}/role?role=${role}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    async adjustAdminUserTokens(userId, amount) {
        const token = localStorage.getItem('ett_token');
        const response = await fetch(`${CONFIG.ADMIN_URL}/moderation/admin/user/${userId}/tokens?amount=${amount}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    async getAdminLogs() {
        const token = localStorage.getItem('ett_token');
        const response = await fetch(`${CONFIG.ADMIN_URL}/moderation/admin/logs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    async updateProfile(username, email, description, socialLinks) {
        const token = localStorage.getItem('ett_token');
        const params = new URLSearchParams();
        if (username) params.append('username', username);
        if (email) params.append('email', email);
        if (description !== undefined) params.append('description', description);
        if (socialLinks !== undefined) params.append('social_links', JSON.stringify(socialLinks));

        const response = await fetch(`${CONFIG.AUTH_URL}/auth/update-profile?${params.toString()}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    async getChannel(username) {
        const response = await fetch(`${CONFIG.AUTH_URL}/auth/channel/${username}`);
        return await response.json();
    },

    async uploadAvatar(file) {
        const token = localStorage.getItem('ett_token');
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${CONFIG.AUTH_URL}/auth/upload-avatar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        return await response.json();
    },

    async uploadBanner(file) {
        const token = localStorage.getItem('ett_token');
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${CONFIG.AUTH_URL}/auth/upload-banner`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        return await response.json();
    }
};
