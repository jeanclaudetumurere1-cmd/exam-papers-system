// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard page loaded');
    loadDashboardData();
    setupEventListeners();
});

function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

async function loadDashboardData() {
    console.log('Loading dashboard data...');
    
    try {
        // Show loading states
        showLoadingStates();
        
        // Fetch papers data
        const papersResponse = await fetch('/api/papers/admin', {
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
        console.log('Papers data received:', papersData);
        
        if (!papersData.success) {
            throw new Error(papersData.message || 'Failed to load papers');
        }
        
        const papers = papersData.data || [];
        
        // Update stats with papers data
        updateStats(papers);
        
        // Display recent papers
        displayRecentPapers(papers.slice(0, 5));
        
        // Load analytics summary
        await loadAnalyticsSummary();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Failed to load dashboard data: ' + error.message, 'error');
        
        // Show error in stats cards
        showErrorStates();
    }
}

function showLoadingStates() {
    const statsContainer = document.getElementById('statsContainer');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-card loading">
                <div class="stat-loader"></div>
                <p>Loading...</p>
            </div>
            <div class="stat-card loading">
                <div class="stat-loader"></div>
                <p>Loading...</p>
            </div>
            <div class="stat-card loading">
                <div class="stat-loader"></div>
                <p>Loading...</p>
            </div>
            <div class="stat-card loading">
                <div class="stat-loader"></div>
                <p>Loading...</p>
            </div>
        `;
    }
}

function showErrorStates() {
    const statsContainer = document.getElementById('statsContainer');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-card error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load data</p>
                <button onclick="loadDashboardData()" class="btn btn-secondary">Retry</button>
            </div>
        `;
    }
}

function updateStats(papers) {
    const totalPapers = papers.length;
    const activePapers = papers.filter(p => p.status === 'active').length;
    const years = [...new Set(papers.map(p => p.year))].length;
    const subjects = [...new Set(papers.map(p => p.subject))].length;
    
    // Update DOM elements
    const statsContainer = document.getElementById('statsContainer');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-card">
                <h3>Total Papers</h3>
                <div class="value">${totalPapers}</div>
            </div>
            <div class="stat-card">
                <h3>Active Papers</h3>
                <div class="value">${activePapers}</div>
            </div>
            <div class="stat-card">
                <h3>Total Years</h3>
                <div class="value">${years}</div>
            </div>
            <div class="stat-card">
                <h3>Subjects</h3>
                <div class="value">${subjects}</div>
            </div>
        `;
    }
}

function displayRecentPapers(papers) {
    const tbody = document.getElementById('recentPapers');
    if (!tbody) return;
    
    if (papers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No papers found</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = papers.map(paper => `
        <tr>
            <td>${paper.id}</td>
            <td>${paper.year}</td>
            <td>${paper.subject}</td>
            <td>${paper.level}</td>
            <td>
                <span class="status-badge ${paper.status === 'active' ? 'status-active' : 'status-inactive'}">
                    ${paper.status}
                </span>
            </td>
        </tr>
    `).join('');
}

async function loadAnalyticsSummary() {
    try {
        const response = await fetch('/api/analytics', {
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Analytics data received:', data);
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load analytics');
        }
        
        // Update visitor stats
        updateVisitorStats(data.data);
        
    } catch (error) {
        console.error('Error loading analytics:', error);
        // Don't show error for analytics - it's not critical
    }
}

function updateVisitorStats(analytics) {
    const elements = {
        totalVisits: document.getElementById('totalVisits'),
        todayVisits: document.getElementById('todayVisits'),
        monthVisits: document.getElementById('monthVisits'),
        totalDownloads: document.getElementById('totalDownloads')
    };
    
    if (elements.totalVisits) {
        elements.totalVisits.textContent = analytics?.visitors?.total || 0;
    }
    if (elements.todayVisits) {
        elements.todayVisits.textContent = analytics?.visitors?.today || 0;
    }
    if (elements.monthVisits) {
        elements.monthVisits.textContent = analytics?.visitors?.thisMonth || 0;
    }
    if (elements.totalDownloads) {
        elements.totalDownloads.textContent = analytics?.downloads?.total || 0;
    }
}

async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            window.location.href = '/admin/login.html';
        } else {
            console.error('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/admin/login.html';
    }
}

function showNotification(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
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