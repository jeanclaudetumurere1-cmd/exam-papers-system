document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard initializing...');
    loadDashboardData();
    setupEventListeners();
    setCurrentDate();
});

function setupEventListeners() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            Auth.logout();
        });
    }
}

function setCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

async function loadDashboardData() {
    console.log('Loading dashboard data...');
    
    // Show loading states
    showLoadingStates();
    
    try {
        // Fetch papers data
        const papersResponse = await fetch('/api/papers/admin', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache',
                'Accept': 'application/json'
            }
        });

        if (!papersResponse.ok) {
            if (papersResponse.status === 401) {
                window.location.href = '/admin/login.html';
                return;
            }
            throw new Error(`HTTP error! status: ${papersResponse.status}`);
        }

        const papersData = await papersResponse.json();
        console.log('Papers API response:', papersData);

        // Fetch analytics data
        const analyticsResponse = await fetch('/api/analytics', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache',
                'Accept': 'application/json'
            }
        });

        if (!analyticsResponse.ok) {
            throw new Error(`Analytics HTTP error! status: ${analyticsResponse.status}`);
        }

        const analyticsData = await analyticsResponse.json();
        console.log('Analytics API response:', analyticsData);

        // Extract papers array
        let papers = [];
        if (papersData.success && Array.isArray(papersData.data)) {
            papers = papersData.data;
        } else if (Array.isArray(papersData)) {
            papers = papersData;
        } else if (papersData.data && Array.isArray(papersData.data)) {
            papers = papersData.data;
        }

        // Extract analytics
        let analytics = {
            visitors: { total: 0, today: 0, thisMonth: 0 },
            papers: { total: 0, active: 0, primary: 0, olevel: 0, alevel: 0, general: 0, tvet: 0 },
            downloads: { total: 0 }
        };

        if (analyticsData.success && analyticsData.data) {
            analytics = analyticsData.data;
        } else if (analyticsData.data) {
            analytics = analyticsData.data;
        }

        // Update all stats
        updateMainStats(papers, analytics);
        updateCategoryBreakdown(papers);
        updateRecentActivity(papers);
        
        console.log('Dashboard updated successfully');

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showErrorStates(error.message);
        showNotification('Failed to load dashboard data: ' + error.message, 'error');
    }
}

function showLoadingStates() {
    const statElements = {
        totalPapers: document.getElementById('totalPapers'),
        activePapers: document.getElementById('activePapers'),
        totalVisits: document.getElementById('totalVisits'),
        totalDownloads: document.getElementById('totalDownloads'),
        primaryCount: document.getElementById('primaryCount'),
        olevelCount: document.getElementById('olevelCount'),
        alevelCount: document.getElementById('alevelCount'),
        generalCount: document.getElementById('generalCount'),
        tvetCount: document.getElementById('tvetCount')
    };

    Object.values(statElements).forEach(el => {
        if (el) el.textContent = '...';
    });

    const activityContainer = document.getElementById('recentActivity');
    if (activityContainer) {
        activityContainer.innerHTML = '<div class="activity-item">Loading recent activity...</div>';
    }
}

function showErrorStates(message) {
    const statElements = {
        totalPapers: document.getElementById('totalPapers'),
        activePapers: document.getElementById('activePapers'),
        totalVisits: document.getElementById('totalVisits'),
        totalDownloads: document.getElementById('totalDownloads'),
        primaryCount: document.getElementById('primaryCount'),
        olevelCount: document.getElementById('olevelCount'),
        alevelCount: document.getElementById('alevelCount'),
        generalCount: document.getElementById('generalCount'),
        tvetCount: document.getElementById('tvetCount')
    };

    Object.values(statElements).forEach(el => {
        if (el) el.textContent = 'Error';
    });

    const activityContainer = document.getElementById('recentActivity');
    if (activityContainer) {
        activityContainer.innerHTML = `
            <div class="activity-item error">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Failed to load: ${message}</span>
            </div>
        `;
    }
}

function updateMainStats(papers, analytics) {
    const totalPapers = papers.length;
    const activePapers = papers.filter(p => p && p.status === 'active').length;
    
    const totalVisits = analytics.visitors?.total || 0;
    const totalDownloads = analytics.downloads?.total || papers.reduce((sum, p) => sum + (p.download_count || 0), 0);

    const elements = {
        totalPapers: document.getElementById('totalPapers'),
        activePapers: document.getElementById('activePapers'),
        totalVisits: document.getElementById('totalVisits'),
        totalDownloads: document.getElementById('totalDownloads')
    };

    if (elements.totalPapers) elements.totalPapers.textContent = totalPapers;
    if (elements.activePapers) elements.activePapers.textContent = activePapers;
    if (elements.totalVisits) elements.totalVisits.textContent = totalVisits;
    if (elements.totalDownloads) elements.totalDownloads.textContent = totalDownloads;
}

function updateCategoryBreakdown(papers) {
    const primary = papers.filter(p => p && p.level === 'Primary').length;
    const olevel = papers.filter(p => p && p.level === 'O-Level').length;
    const alevel = papers.filter(p => p && p.level === 'A-Level').length;
    const general = papers.filter(p => p && p.category === 'General').length;
    const tvet = papers.filter(p => p && p.category === 'TVET').length;

    const elements = {
        primaryCount: document.getElementById('primaryCount'),
        olevelCount: document.getElementById('olevelCount'),
        alevelCount: document.getElementById('alevelCount'),
        generalCount: document.getElementById('generalCount'),
        tvetCount: document.getElementById('tvetCount')
    };

    if (elements.primaryCount) elements.primaryCount.textContent = primary;
    if (elements.olevelCount) elements.olevelCount.textContent = olevel;
    if (elements.alevelCount) elements.alevelCount.textContent = alevel;
    if (elements.generalCount) elements.generalCount.textContent = general;
    if (elements.tvetCount) elements.tvetCount.textContent = tvet;
}

function updateRecentActivity(papers) {
    const activityContainer = document.getElementById('recentActivity');
    if (!activityContainer) return;

    const recentPapers = papers.slice(0, 5);

    if (recentPapers.length === 0) {
        activityContainer.innerHTML = '<div class="activity-item">No recent activity</div>';
        return;
    }

    activityContainer.innerHTML = recentPapers.map(paper => {
        const timeAgo = getTimeAgo(new Date(paper.created_at));
        const level = paper.level || 'Unknown';
        const category = paper.category || 'General';
        const trade = paper.trade_or_combination ? ` (${paper.trade_or_combination})` : '';
        
        // Choose icon based on level
        let icon = 'fa-upload';
        if (level === 'Primary') icon = 'fa-child';
        else if (level === 'O-Level') icon = 'fa-graduation-cap';
        else if (level === 'A-Level') icon = 'fa-university';
        
        return `
            <div class="activity-item">
                <div class="activity-icon upload">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="activity-details">
                    <p><strong>${paper.subject}</strong>${trade} - ${level} (${category})</p>
                    <span class="activity-time">${timeAgo}</span>
                </div>
            </div>
        `;
    }).join('');
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
}

function showNotification(message, type) {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        alert(message);
        return;
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    container.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Make functions available globally
window.loadDashboardData = loadDashboardData;