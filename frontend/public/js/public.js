// ========================================
// NESA PUBLIC PORTAL - SIMPLIFIED VERSION
// ========================================

// Global variables
let allPapers = [];
let filteredPapers = [];
let currentPage = 1;
const itemsPerPage = 12;
let currentView = 'grid';
let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('NESA Public Portal initialized');
    loadPapers();
    setupEventListeners();
    updateBookmarkCount();
    populateYearFilter();
});

// ============== STAFF LOGIN FUNCTIONS ==============

function showStaffLoginModal() {
    const modal = document.getElementById('staffLoginModal');
    if (modal) {
        modal.classList.add('active');
        document.getElementById('staffUsername')?.focus();
    }
}

function closeStaffLoginModal() {
    const modal = document.getElementById('staffLoginModal');
    if (modal) {
        modal.classList.remove('active');
        const username = document.getElementById('staffUsername');
        const password = document.getElementById('staffPassword');
        const errorDiv = document.getElementById('staffLoginError');
        if (username) username.value = '';
        if (password) password.value = '';
        if (errorDiv) errorDiv.style.display = 'none';
    }
}

async function handleStaffLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('staffUsername').value;
    const password = document.getElementById('staffPassword').value;
    const errorDiv = document.getElementById('staffLoginError');
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Invalid credentials');
        }
        
        // Success - redirect to admin dashboard
        window.location.href = '/admin/dashboard.html';
        
    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
        
        // Reset button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Close modal when clicking outside
window.addEventListener('click', function(e) {
    const modal = document.getElementById('staffLoginModal');
    if (e.target === modal) {
        closeStaffLoginModal();
    }
});

// Make sure to add these to the window object at the bottom of your file
window.showStaffLoginModal = showStaffLoginModal;
window.closeStaffLoginModal = closeStaffLoginModal;
window.handleStaffLogin = handleStaffLogin;

function setupEventListeners() {
    // Search
    document.getElementById('searchInput')?.addEventListener('input', function() {
        filterPapers();
    });
    
    // Filters
    document.getElementById('yearFilter')?.addEventListener('change', filterPapers);
    document.getElementById('levelFilter')?.addEventListener('change', filterPapers);
    document.getElementById('categoryFilter')?.addEventListener('change', filterPapers);
    document.getElementById('subjectFilter')?.addEventListener('change', filterPapers);
    
    // Menu toggle
    document.getElementById('menuToggle')?.addEventListener('click', function() {
        document.querySelector('.public-sidebar').classList.toggle('active');
    });
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = '/admin/login.html';
    });
}

function populateYearFilter() {
    const yearFilter = document.getElementById('yearFilter');
    if (!yearFilter) return;
    
    const currentYear = new Date().getFullYear();
    yearFilter.innerHTML = '<option value="">All Years</option>';
    for (let year = currentYear; year >= 2000; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    }
}

async function loadPapers() {
    console.log('Loading papers...');
    
    const container = document.getElementById('papersContainer');
    container.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const response = await fetch('/api/papers/public');
        const data = await response.json();
        
        console.log('API Response:', data);
        
        if (data.success && Array.isArray(data.data)) {
            allPapers = data.data;
        } else if (Array.isArray(data)) {
            allPapers = data;
        } else {
            allPapers = [];
        }
        
        console.log(`Loaded ${allPapers.length} papers`);
        
        // Update stats
        document.getElementById('totalPapersCount').textContent = allPapers.length;
        document.getElementById('totalDownloadsCount').textContent = allPapers.reduce((sum, p) => sum + (p.download_count || 0), 0);
        document.getElementById('yearsCount').textContent = [...new Set(allPapers.map(p => p.year))].length;
        
        // Populate subject filter
        populateSubjectFilter();
        
        // Display papers
        filteredPapers = [...allPapers];
        displayPapers();
        
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444;"></i>
                <h3>Failed to load papers</h3>
                <p>${error.message}</p>
                <button onclick="loadPapers()" style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
    }
}

function populateSubjectFilter() {
    const subjectFilter = document.getElementById('subjectFilter');
    if (!subjectFilter) return;
    
    const subjects = [...new Set(allPapers.map(p => p.subject))].sort();
    subjectFilter.innerHTML = '<option value="">All Subjects</option>';
    
    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        subjectFilter.appendChild(option);
    });
}

function filterPapers() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const year = document.getElementById('yearFilter')?.value || '';
    const level = document.getElementById('levelFilter')?.value || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    const subject = document.getElementById('subjectFilter')?.value || '';
    
    filteredPapers = allPapers.filter(paper => {
        const matchesSearch = paper.subject.toLowerCase().includes(searchTerm);
        const matchesYear = !year || paper.year.toString() === year;
        const matchesLevel = !level || paper.level === level;
        const matchesCategory = !category || paper.category === category;
        const matchesSubject = !subject || paper.subject === subject;
        
        return matchesSearch && matchesYear && matchesLevel && matchesCategory && matchesSubject;
    });
    
    document.getElementById('showingCount').textContent = filteredPapers.length;
    currentPage = 1;
    displayPapers();
}

function displayPapers() {
    const container = document.getElementById('papersContainer');
    
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedPapers = filteredPapers.slice(start, start + itemsPerPage);
    
    if (filteredPapers.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem;">No papers found</div>';
        return;
    }
    
    container.className = `papers-container ${currentView}-view`;
    container.innerHTML = paginatedPapers.map(paper => {
        const fileUrl = paper.file_path ? `/${paper.file_path.replace(/\\/g, '/')}` : '#';
        const isBookmarked = bookmarks.includes(paper.id);
        
        return `
            <div class="paper-card ${currentView}" data-id="${paper.id}">
                <div class="paper-header">
                    <span class="paper-type ${(paper.category || 'general').toLowerCase()}">
                        ${paper.category || 'General'}
                    </span>
                    <span>${paper.year}</span>
                </div>
                <div class="paper-body">
                    <h3>${paper.subject}</h3>
                    <div class="paper-meta">
                        <span><i class="fas fa-graduation-cap"></i> ${paper.level}</span>
                        ${paper.trade_or_combination ? 
                            `<span><i class="fas fa-tag"></i> ${paper.trade_or_combination}</span>` : ''}
                    </div>
                </div>
                <div class="paper-actions">
                    <button class="action-btn download" onclick="downloadPaper(${paper.id}, '${fileUrl}')" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="action-btn preview" onclick="previewPaper('${fileUrl}', '${paper.subject}')" title="Preview">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn bookmark ${isBookmarked ? 'active' : ''}" 
                            onclick="toggleBookmark(${paper.id})" title="Bookmark">
                        <i class="fas fa-bookmark"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    updatePagination();
}

function updatePagination() {
    const totalPages = Math.ceil(filteredPapers.length / itemsPerPage);
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages || 1}`;
    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

function changePage(direction) {
    currentPage += direction;
    displayPapers();
}

function setView(view) {
    currentView = view;
    displayPapers();
}

function toggleFilters() {
    document.getElementById('filtersPanel').classList.toggle('active');
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('yearFilter').value = '';
    document.getElementById('levelFilter').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('subjectFilter').value = '';
    filterPapers();
}

function applyFilters() {
    filterPapers();
    document.getElementById('filtersPanel').classList.remove('active');
}

async function downloadPaper(id, fileUrl) {
    try {
        await fetch('/api/analytics/track-download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paperId: id })
        });
        window.open(fileUrl, '_blank');
    } catch (error) {
        window.open(fileUrl, '_blank');
    }
}

function previewPaper(fileUrl, title) {
    document.getElementById('previewFrame').src = fileUrl;
    document.getElementById('previewTitle').textContent = title;
    document.getElementById('previewModal').classList.add('active');
}

function closePreview() {
    document.getElementById('previewModal').classList.remove('active');
    document.getElementById('previewFrame').src = '';
}

function toggleBookmark(id) {
    const index = bookmarks.indexOf(id);
    if (index === -1) {
        bookmarks.push(id);
        showNotification('Bookmarked');
    } else {
        bookmarks.splice(index, 1);
        showNotification('Bookmark removed');
    }
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    document.getElementById('bookmarkCount').textContent = bookmarks.length;
    displayPapers();
}

function showBookmarks() {
    filteredPapers = allPapers.filter(paper => bookmarks.includes(paper.id));
    currentPage = 1;
    displayPapers();
}

function filterByCategory(category) {
    document.getElementById('categoryFilter').value = category;
    filterPapers();
}

function filterByLevel(level) {
    document.getElementById('levelFilter').value = level;
    filterPapers();
}

function showAllPapers() {
    document.getElementById('searchInput').value = '';
    document.getElementById('yearFilter').value = '';
    document.getElementById('levelFilter').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('subjectFilter').value = '';
    filterPapers();
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1a1e24;
        color: white;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #3b82f6;
        z-index: 9999;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

function refreshPapers() {
    loadPapers();
}

function trackVisit() {
    fetch('/api/analytics/track-visit', { method: 'POST' }).catch(() => {});
}

// Make functions global
window.filterByCategory = filterByCategory;
window.filterByLevel = filterByLevel;
window.showAllPapers = showAllPapers;
window.toggleFilters = toggleFilters;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.setView = setView;
window.downloadPaper = downloadPaper;
window.previewPaper = previewPaper;
window.closePreview = closePreview;
window.toggleBookmark = toggleBookmark;
window.showBookmarks = showBookmarks;
window.changePage = changePage;
window.refreshPapers = refreshPapers;
window.loadPapers = loadPapers;
