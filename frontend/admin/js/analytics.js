// Analytics JavaScript
let visitorsChart = null;
let yearChart = null;
let subjectChart = null;



document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Analytics page initializing...');
    loadAnalytics();
    setupEventListeners();
});

// Admin route - get all papers
router.get('/admin', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM exam_papers ORDER BY created_at DESC'
        );
        
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error fetching admin papers:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch papers',
            data: []
        });
    }
});

function setupEventListeners() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            Auth.logout();
        });
    }

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadAnalytics();
        });
    }
}

async function loadAnalytics() {
    console.log('Loading analytics data...');
    
    // Show loading states
    showLoadingStates();
    
    try {
        const response = await fetch('/api/analytics', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/admin/login.html';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Analytics API response:', result);

        if (!result.success) {
            throw new Error(result.message || 'Failed to load analytics');
        }

        // Extract data
        const data = result.data || {};
        
        // Update summary cards
        updateSummaryCards(data);
        
        // Update lists
        updateLists(data);
        
        // Create charts
        createCharts(data);
        
        console.log('✅ Analytics loaded successfully');

    } catch (error) {
        console.error('❌ Error loading analytics:', error);
        showErrorStates(error.message);
        showNotification('Failed to load analytics: ' + error.message, 'error');
    }
}

function showLoadingStates() {
    // Summary cards
    const summaryElements = {
        totalPapers: document.getElementById('totalPapers'),
        activePapers: document.getElementById('activePapers'),
        totalVisits: document.getElementById('totalVisits'),
        totalDownloads: document.getElementById('totalDownloads')
    };

    Object.values(summaryElements).forEach(el => {
        if (el) el.textContent = '...';
    });

    // Lists
    const yearList = document.getElementById('papersByYearList');
    if (yearList) yearList.innerHTML = '<div class="loading-text">Loading...</div>';

    const subjectList = document.getElementById('papersBySubjectList');
    if (subjectList) subjectList.innerHTML = '<div class="loading-text">Loading...</div>';

    const mostDownloaded = document.getElementById('mostDownloaded');
    if (mostDownloaded) mostDownloaded.innerHTML = '<div class="loading-text">Loading...</div>';
}

function showErrorStates(message) {
    const summaryElements = {
        totalPapers: document.getElementById('totalPapers'),
        activePapers: document.getElementById('activePapers'),
        totalVisits: document.getElementById('totalVisits'),
        totalDownloads: document.getElementById('totalDownloads')
    };

    Object.values(summaryElements).forEach(el => {
        if (el) el.textContent = 'Error';
    });

    const yearList = document.getElementById('papersByYearList');
    if (yearList) yearList.innerHTML = `<div class="error-text">Failed to load: ${message}</div>`;

    const subjectList = document.getElementById('papersBySubjectList');
    if (subjectList) subjectList.innerHTML = `<div class="error-text">Failed to load: ${message}</div>`;

    const mostDownloaded = document.getElementById('mostDownloaded');
    if (mostDownloaded) mostDownloaded.innerHTML = `<div class="error-text">Failed to load: ${message}</div>`;
}

function updateSummaryCards(data) {
    const elements = {
        totalPapers: document.getElementById('totalPapers'),
        activePapers: document.getElementById('activePapers'),
        totalVisits: document.getElementById('totalVisits'),
        totalDownloads: document.getElementById('totalDownloads')
    };

    if (elements.totalPapers) elements.totalPapers.textContent = data.papers?.total || 0;
    if (elements.activePapers) elements.activePapers.textContent = data.papers?.active || 0;
    if (elements.totalVisits) elements.totalVisits.textContent = data.visitors?.total || 0;
    if (elements.totalDownloads) elements.totalDownloads.textContent = data.downloads?.total || 0;
}

function updateLists(data) {
    // Papers by year
    const yearList = document.getElementById('papersByYearList');
    if (yearList && data.papers?.byYear) {
        if (data.papers.byYear.length === 0) {
            yearList.innerHTML = '<div class="no-data">No data available</div>';
        } else {
            yearList.innerHTML = data.papers.byYear.map(item => `
                <div class="stat-row">
                    <span class="stat-label">${item.year}</span>
                    <span class="stat-value">${item.count}</span>
                </div>
            `).join('');
        }
    }

    // Papers by subject
    const subjectList = document.getElementById('papersBySubjectList');
    if (subjectList && data.papers?.bySubject) {
        if (data.papers.bySubject.length === 0) {
            subjectList.innerHTML = '<div class="no-data">No data available</div>';
        } else {
            subjectList.innerHTML = data.papers.bySubject.map(item => `
                <div class="stat-row">
                    <span class="stat-label">${item.subject}</span>
                    <span class="stat-value">${item.count}</span>
                </div>
            `).join('');
        }
    }

    // Most downloaded
    const mostDownloaded = document.getElementById('mostDownloaded');
    if (mostDownloaded) {
        if (data.downloads?.mostDownloaded) {
            const paper = data.downloads.mostDownloaded;
            mostDownloaded.innerHTML = `
                <div class="most-downloaded-card">
                    <h4>${paper.subject}</h4>
                    <p>${paper.year} - ${paper.level}</p>
                    ${paper.trade_or_combination ? `<p class="trade-badge">${paper.trade_or_combination}</p>` : ''}
                    <div class="download-badge">
                        <i class="fas fa-download"></i> ${paper.download_count || 0} downloads
                    </div>
                </div>
            `;
        } else {
            mostDownloaded.innerHTML = '<p class="no-data">No download data available</p>';
        }
    }
}

function createCharts(data) {
    // Destroy existing charts
    destroyCharts();

    // Visitors Chart (Line Chart)
    const visitorsCtx = document.getElementById('visitorsChart')?.getContext('2d');
    if (visitorsCtx) {
        // Generate last 30 days data
        const labels = [];
        const values = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            // In production, this would come from the API
            values.push(Math.floor(Math.random() * 30) + 10);
        }

        visitorsChart = new Chart(visitorsCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Visitors',
                    data: values,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#2d3748' },
                        ticks: { color: '#b3b9c4', stepSize: 5 }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#b3b9c4', maxRotation: 45 }
                    }
                }
            }
        });
    }

    // Papers by Year Chart (Bar Chart)
    const yearCtx = document.getElementById('papersYearChart')?.getContext('2d');
    if (yearCtx && data.papers?.byYear && data.papers.byYear.length > 0) {
        yearChart = new Chart(yearCtx, {
            type: 'bar',
            data: {
                labels: data.papers.byYear.map(item => item.year),
                datasets: [{
                    label: 'Number of Papers',
                    data: data.papers.byYear.map(item => item.count),
                    backgroundColor: '#3b82f6',
                    borderRadius: 6,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#2d3748' },
                        ticks: { color: '#b3b9c4', stepSize: 1, precision: 0 }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#b3b9c4' }
                    }
                }
            }
        });
    }

    // Subjects Pie Chart
    const subjectCtx = document.getElementById('subjectsChart')?.getContext('2d');
    if (subjectCtx && data.papers?.bySubject && data.papers.bySubject.length > 0) {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#6366f1'];

        subjectChart = new Chart(subjectCtx, {
            type: 'pie',
            data: {
                labels: data.papers.bySubject.map(item => item.subject),
                datasets: [{
                    data: data.papers.bySubject.map(item => item.count),
                    backgroundColor: colors.slice(0, data.papers.bySubject.length),
                    borderWidth: 2,
                    borderColor: '#1a1e24'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#b3b9c4', font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

function destroyCharts() {
    if (visitorsChart && typeof visitorsChart.destroy === 'function') {
        visitorsChart.destroy();
        visitorsChart = null;
    }
    if (yearChart && typeof yearChart.destroy === 'function') {
        yearChart.destroy();
        yearChart = null;
    }
    if (subjectChart && typeof subjectChart.destroy === 'function') {
        subjectChart.destroy();
        subjectChart = null;
    }
}

function showNotification(message, type) {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        console.log(message);
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
window.loadAnalytics = loadAnalytics;