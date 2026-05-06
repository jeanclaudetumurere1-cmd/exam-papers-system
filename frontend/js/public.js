// ========================================
// NESA PUBLIC PORTAL - MAIN JAVASCRIPT
// ========================================

// Global variables
let allPapers = [];
let filteredPapers = [];
let currentPage = 1;
const itemsPerPage = 12;
let currentView = 'grid';
let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
let currentPaperForShare = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('NESA Public Portal initialized');
    initializePage();
    loadPapers(); // Load papers immediately
    setupEventListeners();
    updateBookmarkCount();
});

function initializePage() {
    console.log('Initializing page...');
    
    // Populate year filter
    const yearFilter = document.getElementById('yearFilter');
    if (yearFilter) {
        const currentYear = new Date().getFullYear();
        yearFilter.innerHTML = '<option value="">All Years</option>';
        for (let year = currentYear; year >= 2000; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearFilter.appendChild(option);
        }
    }
    
    // Set default view from localStorage
    const savedView = localStorage.getItem('viewMode');
    if (savedView) {
        setView(savedView);
    }
    
    // Menu toggle
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Search with debounce
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 500));
    }
    
    // Filter changes
    document.getElementById('yearFilter')?.addEventListener('change', filterPapers);
    document.getElementById('levelFilter')?.addEventListener('change', filterPapers);
    document.getElementById('categoryFilter')?.addEventListener('change', filterPapers);
    document.getElementById('subjectFilter')?.addEventListener('change', filterPapers);
    document.getElementById('tradeFilter')?.addEventListener('input', debounce(filterPapers, 500));
    
    // Close modal on outside click
    window.addEventListener('click', function(e) {
        const previewModal = document.getElementById('previewModal');
        const shareModal = document.getElementById('shareModal');
        
        if (e.target === previewModal) closePreview();
        if (e.target === shareModal) closeShareModal();
    });
}

// ========================================
// PAPER LOADING AND DISPLAY
// ========================================

async function loadPapers() {
    console.log('Loading papers from API...');
    
    // Show loading state
    const container = document.getElementById('papersContainer');
    if (container) {
        container.innerHTML = '<div class="loading-spinner"></div>';
    }
    
    try {
        // Use the correct API endpoint
        const response = await fetch('/api/papers/public');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        // Handle different response formats
        if (data.success && Array.isArray(data.data)) {
            allPapers = data.data;
        } else if (Array.isArray(data)) {
            allPapers = data;
        } else if (data.data && Array.isArray(data.data)) {
            allPapers = data.data;
        } else {
            console.warn('Unexpected data format:', data);
            allPapers = [];
        }
        
        console.log(`Loaded ${allPapers.length} papers`);
        
        // Populate subject filter
        populateSubjectFilter();
        
        // Update stats
        updateStats();
        
        // Display papers
        filteredPapers = [...allPapers];
        displayPapers();
        
    } catch (error) {
        console.error('Error loading papers:', error);
        
        // Show error message
        if (container) {
            container.innerHTML = `
                <div class="error-container">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load papers</h3>
                    <p>${error.message}</p>
                    <button onclick="loadPapers()" class="btn-primary">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            `;
        }
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

function updateStats() {
    const totalPapers = allPapers.length;
    const totalDownloads = allPapers.reduce((sum, paper) => sum + (paper.download_count || 0), 0);
    const years = [...new Set(allPapers.map(p => p.year))].length;
    
    const totalEl = document.getElementById('totalPapersCount');
    const downloadsEl = document.getElementById('totalDownloadsCount');
    const yearsEl = document.getElementById('yearsCount');
    
    if (totalEl) totalEl.textContent = totalPapers;
    if (downloadsEl) downloadsEl.textContent = totalDownloads;
    if (yearsEl) yearsEl.textContent = years;
}

function filterPapers() {
    console.log('Filtering papers...');
    
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const year = document.getElementById('yearFilter')?.value || '';
    const level = document.getElementById('levelFilter')?.value || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    const subject = document.getElementById('subjectFilter')?.value || '';
    const trade = document.getElementById('tradeFilter')?.value.toLowerCase() || '';
    
    filteredPapers = allPapers.filter(paper => {
        const matchesSearch = (paper.subject?.toLowerCase().includes(searchTerm) ||
                              (paper.trade_or_combination || '').toLowerCase().includes(searchTerm));
        const matchesYear = !year || paper.year?.toString() === year;
        const matchesLevel = !level || paper.level === level;
        const matchesCategory = !category || paper.category === category;
        const matchesSubject = !subject || paper.subject === subject;
        const matchesTrade = !trade || (paper.trade_or_combination || '').toLowerCase().includes(trade);
        
        return matchesSearch && matchesYear && matchesLevel && matchesCategory && 
               matchesSubject && matchesTrade;
    });
    
    console.log(`Filtered to ${filteredPapers.length} papers`);
    
    // Reset to first page
    currentPage = 1;
    displayPapers();
}

function displayPapers() {
    const container = document.getElementById('papersContainer');
    if (!container) return;
    
    // Update results count
    const showingCount = document.getElementById('showingCount');
    if (showingCount) {
        showingCount.textContent = filteredPapers.length;
    }
    
    // Apply pagination
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedPapers = filteredPapers.slice(start, start + itemsPerPage);
    
    if (filteredPapers.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>No papers found</h3>
                <p>Try adjusting your filters or search terms</p>
                <button onclick="resetFilters()" class="btn-primary">
                    <i class="fas fa-undo"></i> Reset Filters
                </button>
            </div>
        `;
        updatePagination(0);
        return;
    }
    
    // Set view class
    container.className = `papers-container ${currentView}-view`;
    
    // Generate HTML
    container.innerHTML = paginatedPapers.map(paper => {
        const isBookmarked = bookmarks.includes(paper.id);
        const fileUrl = paper.file_path ? `/${paper.file_path.replace(/\\/g, '/')}` : '#';
        
        if (currentView === 'grid') {
            return `
                <div class="paper-card grid" data-id="${paper.id}">
                    <div class="paper-header">
                        <span class="paper-type ${(paper.category || 'General').toLowerCase()}">
                            ${paper.category || 'General'}
                        </span>
                        <span class="paper-year">${paper.year}</span>
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
                        <button class="action-btn share" onclick="sharePaper(${paper.id})" title="Share">
                            <i class="fas fa-share-alt"></i>
                        </button>
                        <button class="action-btn print" onclick="printPaper('${fileUrl}')" title="Print">
                            <i class="fas fa-print"></i>
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
        } else {
            return `
                <div class="paper-card list" data-id="${paper.id}">
                    <div class="paper-header">
                        <span class="paper-type ${(paper.category || 'General').toLowerCase()}">
                            ${paper.category || 'General'}
                        </span>
                    </div>
                    <div class="paper-body">
                        <h3>${paper.subject}</h3>
                        <div class="paper-meta">
                            <span><i class="fas fa-calendar"></i> ${paper.year}</span>
                            <span><i class="fas fa-graduation-cap"></i> ${paper.level}</span>
                            ${paper.trade_or_combination ? 
                                `<span><i class="fas fa-tag"></i> ${paper.trade_or_combination}</span>` : ''}
                        </div>
                    </div>
                    <div class="paper-actions">
                        <button class="action-btn download" onclick="downloadPaper(${paper.id}, '${fileUrl}')" title="Download">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="action-btn share" onclick="sharePaper(${paper.id})" title="Share">
                            <i class="fas fa-share-alt"></i>
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
        }
    }).join('');
    
    updatePagination(filteredPapers.length);
}

function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage} of ${Math.max(1, totalPages)}`;
    }
    
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
    }
}

function changePage(direction) {
    const totalPages = Math.ceil(filteredPapers.length / itemsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        displayPapers();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ========================================
// FILTER FUNCTIONS
// ========================================

function handleSearch() {
    currentPage = 1;
    filterPapers();
}

function applyFilters() {
    filterPapers();
    document.getElementById('filtersPanel')?.classList.remove('active');
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('yearFilter').value = '';
    document.getElementById('levelFilter').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('subjectFilter').value = '';
    document.getElementById('tradeFilter').value = '';
    
    currentPage = 1;
    filterPapers();
}

async function filterByCategory(category) {
    console.log(`Filtering by category: ${category}`);
    
    // Update active state in sidebar
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    if (event) event.target.classList.add('active');
    
    if (category === 'all') {
        await loadPapers();
    } else {
        try {
            const response = await fetch(`/api/public/papers/category/${category}`);
            const result = await response.json();
            
            if (result.success) {
                allPapers = result.data || [];
                filteredPapers = [...allPapers];
                displayPapers();
                updateStats();
                populateSubjectFilter();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
    
    // Reset category filter dropdown
    document.getElementById('categoryFilter').value = category === 'all' ? '' : category;
}

async function filterByLevel(level) {
    console.log(`Filtering by level: ${level}`);
    
    // Update active state in sidebar
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    if (event) event.target.classList.add('active');
    
    try {
        const response = await fetch(`/api/public/papers/level/${level}`);
        const result = await response.json();
        
        if (result.success) {
            allPapers = result.data || [];
            filteredPapers = [...allPapers];
            displayPapers();
            updateStats();
            populateSubjectFilter();
        }
    } catch (error) {
        console.error('Error:', error);
    }
    
    // Reset level filter dropdown
    document.getElementById('levelFilter').value = level;
}

async function showAllPapers() {
    console.log('Showing all papers');
    
    // Update active state in sidebar
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    if (event) event.target.classList.add('active');
    
    await loadPapers();
    
    // Reset all filters
    document.getElementById('searchInput').value = '';
    document.getElementById('yearFilter').value = '';
    document.getElementById('levelFilter').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('subjectFilter').value = '';
    document.getElementById('tradeFilter').value = '';
}

function toggleFilters() {
    document.getElementById('filtersPanel')?.classList.toggle('active');
}

function setView(view) {
    currentView = view;
    localStorage.setItem('viewMode', view);
    
    // Update active button
    document.querySelectorAll('.view-option').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event) event.target.closest('.view-option')?.classList.add('active');
    
    displayPapers();
}

// ========================================
// PAPER ACTIONS
// ========================================

async function downloadPaper(id, fileUrl) {
    try {
        await fetch('/api/analytics/track-download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paperId: id })
        });
        
        window.open(fileUrl, '_blank');
        showNotification('Download started', 'success');
    } catch (error) {
        console.error('Error tracking download:', error);
        window.open(fileUrl, '_blank');
    }
}

function sharePaper(id) {
    const paper = allPapers.find(p => p.id === id);
    if (!paper) return;
    
    currentPaperForShare = paper;
    const shareUrl = `${window.location.origin}/${paper.file_path.replace(/\\/g, '/')}`;
    
    document.getElementById('shareLink').textContent = shareUrl;
    document.getElementById('shareModal').classList.add('active');
}

function shareViaWhatsApp() {
    if (!currentPaperForShare) return;
    const text = `Check out this ${currentPaperForShare.subject} ${currentPaperForShare.level} past paper from NESA Rwanda`;
    const url = `${window.location.origin}/${currentPaperForShare.file_path.replace(/\\/g, '/')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    closeShareModal();
}

function shareViaEmail() {
    if (!currentPaperForShare) return;
    const subject = `${currentPaperForShare.subject} ${currentPaperForShare.level} Past Paper`;
    const body = `Here's the ${currentPaperForShare.subject} ${currentPaperForShare.level} past paper from ${currentPaperForShare.year}\n\n`;
    const url = `${window.location.origin}/${currentPaperForShare.file_path.replace(/\\/g, '/')}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + url)}`;
    closeShareModal();
}

function copyLink() {
    const shareLink = document.getElementById('shareLink').textContent;
    navigator.clipboard.writeText(shareLink).then(() => {
        showNotification('Link copied to clipboard!', 'success');
        closeShareModal();
    }).catch(() => {
        showNotification('Failed to copy link', 'error');
    });
}

function printPaper(fileUrl) {
    const printWindow = window.open(fileUrl);
    printWindow.onload = function() {
        printWindow.print();
    };
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

function closeShareModal() {
    document.getElementById('shareModal').classList.remove('active');
    currentPaperForShare = null;
}

// ========================================
// BOOKMARK FUNCTIONS
// ========================================

function toggleBookmark(id) {
    const index = bookmarks.indexOf(id);
    if (index === -1) {
        bookmarks.push(id);
        showNotification('Paper bookmarked', 'success');
    } else {
        bookmarks.splice(index, 1);
        showNotification('Bookmark removed', 'warning');
    }
    
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    updateBookmarkCount();
    displayPapers();
}

function updateBookmarkCount() {
    const countEl = document.getElementById('bookmarkCount');
    if (countEl) {
        countEl.textContent = bookmarks.length;
    }
}

function showBookmarks() {
    filteredPapers = allPapers.filter(paper => bookmarks.includes(paper.id));
    currentPage = 1;
    displayPapers();
    
    // Update active state
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    if (event) event.target.classList.add('active');
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showNotification(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        alert(message);
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 
                              type === 'error' ? 'exclamation-circle' : 
                              'exclamation-triangle'}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function toggleSidebar() {
    document.querySelector('.public-sidebar')?.classList.toggle('active');
}

function refreshPapers() {
    loadPapers();
    showNotification('Refreshing papers...', 'success');
}

async function trackVisit() {
    try {
        await fetch('/api/analytics/track-visit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error tracking visit:', error);
    }
}

// Make functions globally available
window.filterByCategory = filterByCategory;
window.filterByLevel = filterByLevel;
window.showAllPapers = showAllPapers;
window.toggleFilters = toggleFilters;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.setView = setView;
window.downloadPaper = downloadPaper;
window.sharePaper = sharePaper;
window.printPaper = printPaper;
window.previewPaper = previewPaper;
window.closePreview = closePreview;
window.toggleBookmark = toggleBookmark;
window.showBookmarks = showBookmarks;
window.changePage = changePage;
window.refreshPapers = refreshPapers;
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareViaEmail = shareViaEmail;
window.copyLink = copyLink;
window.closeShareModal = closeShareModal;
window.loadPapers = loadPapers;