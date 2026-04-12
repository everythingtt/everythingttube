// API Interaction Layer for EverythingTTUBE

const API = {
    // Utility for headers
    getHeaders(extraHeaders = {}) {
        const headers = {
            ...extraHeaders
        };
        
        // 1. Attach Access Token (Bearer) - REQUIRED for cross-subdomain ngrok tunnels
        const accessToken = localStorage.getItem('ett_token');
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        // 2. Attach CSRF token (only useful if on same domain as cookie, but we send it anyway)
        const csrfToken = localStorage.getItem('ett_csrf') || this.getCookie('ett_csrf');
        if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
        }

        return headers;
    },

    // Helper to read cookies
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    },

    // Global fetch wrapper
    async fetch(url, options = {}) {
        // Handle relative URLs
        let absoluteUrl = url;
        if (!url.startsWith('http')) {
            absoluteUrl = new URL(url, window.location.origin).toString();
        }

        // Append ngrok bypass query parameter to ALL ngrok requests
        if (absoluteUrl.includes('ngrok-free.dev')) {
            const urlObj = new URL(absoluteUrl);
            urlObj.searchParams.set('ngrok-skip-browser-warning', 'any');
            absoluteUrl = urlObj.toString();
        }

        options.headers = this.getHeaders(options.headers || {});
        
        // CRITICAL: Include credentials (cookies) for all requests
        options.credentials = 'include';

        try {
            const response = await fetch(absoluteUrl, options);
            if (response.status === 401) {
                // If unauthorized, redirect to login unless we are already there
                if (!window.location.href.includes('auth.html')) {
                    this.logout();
                }
            }
            return response;
        } catch (error) {
            console.error(`Fetch failed for ${url}:`, error);
            this.handleNetworkError(url, error);
            throw error;
        }
    },

    // XSS Protection: Escape HTML characters
    escapeHTML(str) {
        if (!str) return "";
        return String(str).replace(/[&<>"']/g, function(m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[m];
        });
    },

    handleNetworkError(url, error) {
        // Simple alert for now, can be improved with a toast or status bar
        const isNgrok = url.includes('ngrok-free.dev');
        if (isNgrok) {
            console.warn("Ngrok tunnel appears to be offline or failing. Check your tunnel status.");
        }
    },

    getServiceUrl(service) {
        switch (service) {
            case 'api': return CONFIG.API_URL;
            case 'auth': return CONFIG.AUTH_URL;
            case 'stream': return CONFIG.STREAM_URL;
            case 'upload': return CONFIG.UPLOAD_URL;
            case 'admin': return CONFIG.ADMIN_URL;
            default: return CONFIG.API_URL;
        }
    },

    getResourceUrl(service, path) {
        if (!path) return "";
        let baseUrl = this.getServiceUrl(service);
        // Ensure path starts with / if baseUrl doesn't end with /
        if (!baseUrl.endsWith('/') && !path.startsWith('/')) {
            baseUrl += '/';
        } else if (baseUrl.endsWith('/') && path.startsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }
        
        let url = `${baseUrl}${path}`;
        
        // Append ngrok bypass query parameter to ALL ngrok requests
        if (url.includes('ngrok-free.dev')) {
            const urlObj = new URL(url);
            urlObj.searchParams.set('ngrok-skip-browser-warning', 'any');
            url = urlObj.toString();
        }
        return url;
    },

    // Auth
    async login(email, password) {
        console.log(`%c[AUTH] Attempting login for ${email}...`, "color: #3498db;");
        const response = await this.fetch(`${CONFIG.AUTH_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        if (response.ok && data.access_token) {
            console.log("%c[AUTH] Login successful! Session tokens stored.", "color: #2ecc71; font-weight: bold;");
            // Store tokens in localStorage as an emergency fallback for cross-domain cookie issues
            localStorage.setItem('ett_token', data.access_token);
            if (data.csrf_token) {
                localStorage.setItem('ett_csrf', data.csrf_token);
            }
        } else {
            console.error(`%c[AUTH] Login failed: ${data.detail || 'Invalid credentials'}`, "color: #e74c3c;");
        }
        return data;
    },

    async register(email, username, password) {
        console.log(`%c[AUTH] Registering new user: ${username}...`, "color: #3498db;");
        const response = await this.fetch(`${CONFIG.AUTH_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password })
        });
        
        const data = await response.json();
        if (response.ok && data.access_token) {
            console.log("%c[AUTH] Registration successful!", "color: #2ecc71; font-weight: bold;");
            localStorage.setItem('ett_token', data.access_token);
            if (data.csrf_token) {
                localStorage.setItem('ett_csrf', data.csrf_token);
            }
        } else {
            console.error(`%c[AUTH] Registration failed: ${data.detail || 'Unknown error'}`, "color: #e74c3c;");
        }
        return data;
    },

    async getMe() {
        const response = await this.fetch(`${CONFIG.AUTH_URL}/auth/me`);
        if (!response.ok) return null;
        return await response.json();
    },

    async logout() {
        try {
            await this.fetch(`${CONFIG.AUTH_URL}/auth/logout`, { method: 'POST' });
        } catch (e) {
            console.warn("Logout request failed", e);
        }
        // Clear tokens from localStorage
        localStorage.removeItem('ett_token');
        localStorage.removeItem('ett_csrf');
        window.location.href = 'auth.html';
    },

    // Videos
    async listVideos() {
        const response = await this.fetch(`${CONFIG.API_URL}/video/list`);
        return await response.json();
    },

    async searchVideos(query, quality = null, sort = 'newest') {
        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (quality) params.append('quality', quality);
        if (sort) params.append('sort', sort);
        const response = await this.fetch(`${CONFIG.API_URL}/video/search?${params.toString()}`);
        return await response.json();
    },

    async uploadVideo(formData) {
        console.log("%c[UPLOAD] Starting video upload...", "color: #3498db; font-weight: bold;");
        const response = await this.fetch(`${CONFIG.UPLOAD_URL}/video/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (response.ok) {
            console.log(`%c[UPLOAD] SUCCESS: Video #${data.video_id} is being processed.`, "color: #2ecc71; font-weight: bold;");
        } else {
            console.error(`%c[UPLOAD] FAILED: ${data.detail || 'Server error'}`, "color: #e74c3c;");
        }
        return data;
    },

    async uploadSubtitles(videoId, file) {
        console.log(`%c[UPLOAD] Uploading subtitles for video #${videoId}...`, "color: #3498db;");
        const formData = new FormData();
        formData.append('file', file);
        const response = await this.fetch(`${CONFIG.UPLOAD_URL}/video/upload-subtitles/${videoId}`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (response.ok) {
            console.log("%c[UPLOAD] Subtitles uploaded successfully.", "color: #2ecc71;");
        }
        return data;
    },

    async getVideoStream(videoId) {
        console.log(`%c[STREAM] Requesting manifest for video #${videoId}...`, "color: #9b59b6;");
        const response = await this.fetch(`${CONFIG.API_URL}/video/stream/${videoId}`);
        const data = await response.json();
        if (response.ok) {
            console.log(`%c[STREAM] Manifest received. Type: ${data.type.toUpperCase()}`, "color: #2ecc71;");
        }
        return data;
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
        const formData = new FormData();
        for (const [key, value] of Object.entries(metadata)) {
            if (value !== undefined && value !== null) {
                formData.append(key, value);
            }
        }
        const response = await this.fetch(`${CONFIG.API_URL}/studio/video/${videoId}/update`, {
            method: 'POST',
            body: formData
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

    // Engagement
    async postComment(videoId, content) {
        const response = await this.fetch(`${CONFIG.API_URL}/engagement/comment/${videoId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        return await response.json();
    },

    async getComments(videoId) {
        const response = await this.fetch(`${CONFIG.API_URL}/engagement/comments/${videoId}`);
        return await response.json();
    },

    async editComment(commentId, content) {
        const response = await this.fetch(`${CONFIG.API_URL}/engagement/comment/${commentId}/edit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        return await response.json();
    },

    async deleteComment(commentId) {
        const response = await this.fetch(`${CONFIG.API_URL}/engagement/comment/${commentId}`, {
            method: 'DELETE'
        });
        return await response.json();
    },

    async toggleLike(videoId) {
        const response = await this.fetch(`${CONFIG.API_URL}/engagement/like/${videoId}`, {
            method: 'POST'
        });
        return await response.json();
    },

    async toggleSubscribe(creatorId) {
        const response = await this.fetch(`${CONFIG.API_URL}/engagement/subscribe/${creatorId}`, {
            method: 'POST'
        });
        return await response.json();
    },

    async recordView(videoId) {
        const response = await this.fetch(`${CONFIG.API_URL}/engagement/view/${videoId}`, {
            method: 'POST'
        });
        return await response.json();
    },

    async getEngagementStats(videoId) {
        const response = await this.fetch(`${CONFIG.API_URL}/engagement/stats/${videoId}`);
        return await response.json();
    },

    // History
    async updateHistory(videoId, position) {
        const response = await this.fetch(`${CONFIG.API_URL}/history/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_id: videoId, position: Math.floor(position) })
        });
        return await response.json();
    },

    async getHistory() {
        const response = await this.fetch(`${CONFIG.API_URL}/history/list`);
        return await response.json();
    },

    async getResumePoint(videoId) {
        const response = await this.fetch(`${CONFIG.API_URL}/history/resume/${videoId}`);
        return await response.json();
    },

    async clearHistory() {
        const response = await this.fetch(`${CONFIG.API_URL}/history/clear`, {
            method: 'DELETE'
        });
        return await response.json();
    },

    // Community
    async createCommunityPost(formData) {
        const response = await this.fetch(`${CONFIG.API_URL}/community/post`, {
            method: 'POST',
            body: formData
        });
        return await response.json();
    },

    async getChannelPosts(username) {
        const response = await this.fetch(`${CONFIG.API_URL}/community/channel/${username}`);
        return await response.json();
    },

    async likeCommunityPost(postId) {
        const response = await this.fetch(`${CONFIG.API_URL}/community/like/${postId}`, {
            method: 'POST'
        });
        return await response.json();
    },

    // Notifications
    async getNotifications() {
        const response = await this.fetch(`${CONFIG.API_URL}/notifications/`);
        return await response.json();
    },

    async markNotificationRead(notifId) {
        const response = await this.fetch(`${CONFIG.API_URL}/notifications/read/${notifId}`, {
            method: 'POST'
        });
        return await response.json();
    },

    async markAllNotificationsRead() {
        const response = await this.fetch(`${CONFIG.API_URL}/notifications/read-all`, {
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
