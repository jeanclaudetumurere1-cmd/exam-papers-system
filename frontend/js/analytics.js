// Analytics JavaScript
let visitorsChart = null;
let yearChart = null;
let subjectChart = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Analytics page loaded');
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded!');
        showNotification('Chart.js library failed to load. Please refresh the page.', 'error');
        return;
    }
    
    loadAnalytics();
    setupEventListeners();
});

function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            Auth.logout();
        });
    }
    
    // Refresh button
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
        
        // Extract data from response
        const data = result.data || {};
        
        // Display the analytics
        displayAnalytics(data);
        
        // Create charts with a slight delay to ensure DOM is ready
        setTimeout(() => {
            createCharts(data);
        }, 100);
        
    } catch (error) {
        console.error('Error loading analytics:', error);
        showError(error.message);
        showNotification('Failed to load analytics: ' + error.message, 'error');
    }
}

function showLoadingStates() {
    // Update summary cards with loading state
    const summaryElements = {
        totalPapers: document.getElementById('totalPapers'),
        activePapers: document.getElementById('activePapers'),
        totalVisits: document.getElementById('totalVisits'),
        totalDownloads: document.getElementById('totalDownloads')
    };
    
    Object.values(summaryElements).forEach(el => {
        if (el) el.textContent = '...';
    });
    
    // Show loading in lists
    const yearList = document.getElementById('papersByYear');
    if (yearList) yearList.innerHTML = '<div class="loading-text">Loading...</div>';
    
    const subjectList = document.getElementById('papersBySubject');
    if (subjectList) subjectList.innerHTML = '<div class="loading-text">Loading...</div>';
    
    const mostDownloaded = document.getElementById('mostDownloaded');
    if (mostDownloaded) mostDownloaded.innerHTML = '<div class="loading-text">Loading...</div>';
}

function showError(message) {
    // Show error in summary cards
    const summaryElements = {
        totalPapers: document.getElementById('totalPapers'),
        activePapers: document.getElementById('activePapers'),
        totalVisits: document.getElementById('totalVisits'),
        totalDownloads: document.getElementById('totalDownloads')
    };
    
    Object.values(summaryElements).forEach(el => {
        if (el) el.textContent = 'Error';
    });
    
    // Show error in lists
    const yearList = document.getElementById('papersByYear');
    if (yearList) yearList.innerHTML = `<div class="error-text">Failed to load: ${message}</div>`;
    
    const subjectList = document.getElementById('papersBySubject');
    if (subjectList) subjectList.innerHTML = `<div class="error-text">Failed to load: ${message}</div>`;
    
    const mostDownloaded = document.getElementById('mostDownloaded');
    if (mostDownloaded) mostDownloaded.innerHTML = `<div class="error-text">Failed to load: ${message}</div>`;
}

function displayAnalytics(data) {
    console.log('Displaying analytics:', data);
    
    // Safely access nested properties with defaults
    const visitors = data.visitors || {};
    const papers = data.papers || {};
    const downloads = data.downloads || {};
    
    // Update summary cards
    const elements = {
        totalPapers: document.getElementById('totalPapers'),
        activePapers: document.getElementById('activePapers'),
        totalVisits: document.getElementById('totalVisits'),
        totalDownloads: document.getElementById('totalDownloads')
    };
    
    if (elements.totalPapers) elements.totalPapers.textContent = papers.total || 0;
    if (elements.activePapers) elements.activePapers.textContent = papers.active || 0;
    if (elements.totalVisits) elements.totalVisits.textContent = visitors.total || 0;
    if (elements.totalDownloads) elements.totalDownloads.textContent = downloads.total || 0;
    
    // Display papers by year
    displayPapersByYear(papers.byYear || []);
    
    // Display papers by subject
    displayPapersBySubject(papers.bySubject || []);
    
    // Display most downloaded
    displayMostDownloaded(downloads.mostDownloaded);
}

function displayPapersByYear(yearData) {
    const container = document.getElementById('papersByYear');
    if (!container) return;
    
    if (!yearData || yearData.length === 0) {
        container.innerHTML = '<div class="no-data">No data available</div>';
        return;
    }
    
    container.innerHTML = yearData.map(item => `
        <div class="stat-item">
            <span class="stat-label">${item.year}</span>
            <span class="stat-value">${item.count}</span>
        </div>
    `).join('');
}

function displayPapersBySubject(subjectData) {
    const container = document.getElementById('papersBySubject');
    if (!container) return;
    
    if (!subjectData || subjectData.length === 0) {
        container.innerHTML = '<div class="no-data">No data available</div>';
        return;
    }
    
    container.innerHTML = subjectData.map(item => `
        <div class="stat-item">
            <span class="stat-label">${item.subject}</span>
            <span class="stat-value">${item.count}</span>
        </div>
    `).join('');
}

function displayMostDownloaded(mostDownloaded) {
    const container = document.getElementById('mostDownloaded');
    if (!container) return;
    
    if (!mostDownloaded || !mostDownloaded.id) {
        container.innerHTML = '<div class="no-data">No download data available</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="most-downloaded-card">
            <h4>${mostDownloaded.subject}</h4>
            <div class="details">
                <span class="badge">${mostDownloaded.year}</span>
                <span class="badge">${mostDownloaded.level}</span>
            </div>
            <div class="download-count">
                <i class="fas fa-download"></i>
                <span>${mostDownloaded.download_count || 0} downloads</span>
            </div>
        </div>
    `;
}

function destroyCharts() {
    // Safely destroy charts if they exist
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

function createCharts(data) {
    // Destroy existing charts first
    destroyCharts();
    
    // Safely access data
    const visitors = data.visitors || {};
    const papers = data.papers || {};
    
    // Check if Chart is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not available');
        return;
    }
    
    // Visitors Chart (Line Chart)
    const visitorsCanvas = document.getElementById('visitorsChart');
    if (visitorsCanvas) {
        try {
            const ctx = visitorsCanvas.getContext('2d');
            
            // Generate last 30 days labels
            const labels = [];
            const last30Days = [];
            for (let i = 29; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                // Generate sample data - in production, this would come from the API
                last30Days.push(Math.floor(Math.random() * 30) + 5);
            }
            
            visitorsChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Visitors',
                        data: last30Days,
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
                        legend: {
                            labels: {
                                color: '#b3b9c4'
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: '#2d3748',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#b3b9c4',
                                stepSize: 5
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#b3b9c4',
                                maxRotation: 45,
                                minRotation: 45
                            }
                        }
                    }
                }
            });
            console.log('Visitors chart created');
        } catch (error) {
            console.error('Error creating visitors chart:', error);
        }
    }
    
    // Papers by Year Chart (Bar Chart)
    const yearCanvas = document.getElementById('papersYearChart');
    if (yearCanvas && papers.byYear && papers.byYear.length > 0) {
        try {
            const ctx = yearCanvas.getContext('2d');
            
            yearChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: papers.byYear.map(item => item.year),
                    datasets: [{
                        label: 'Number of Papers',
                        data: papers.byYear.map(item => item.count),
                        backgroundColor: '#3b82f6',
                        borderRadius: 6,
                        barPercentage: 0.6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: '#2d3748',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#b3b9c4',
                                stepSize: 1,
                                precision: 0
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#b3b9c4'
                            }
                        }
                    }
                }
            });
            console.log('Year chart created');
        } catch (error) {
            console.error('Error creating year chart:', error);
        }
    }
    
    // Subjects Pie Chart
    const subjectCanvas = document.getElementById('subjectsChart');
    if (subjectCanvas && papers.bySubject && papers.bySubject.length > 0) {
        try {
            const ctx = subjectCanvas.getContext('2d');
            
            const colors = [
                '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
                '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#6366f1'
            ];
            
            subjectChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: papers.bySubject.map(item => item.subject),
                    datasets: [{
                        data: papers.bySubject.map(item => item.count),
                        backgroundColor: colors.slice(0, papers.bySubject.length),
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
                            labels: {
                                color: '#b3b9c4',
                                font: {
                                    size: 11
                                }
                            }
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
            console.log('Subject chart created');
        } catch (error) {
            console.error('Error creating subject chart:', error);
        }
    }
}

function showNotification(message, type = 'success') {
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