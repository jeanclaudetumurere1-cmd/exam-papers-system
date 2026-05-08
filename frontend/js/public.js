// ========================================
// NESA PUBLIC PORTAL - MAIN JAVASCRIPT
// ========================================

// Global variables
let allPapers = [];
let filteredPapers = [];
let currentPage = 1;
const itemsPerPage = 12;
let currentView = 'grid';
let bookmarks = [];
let likedPapers = [];

try {
    bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
} catch (e) {
    bookmarks = [];
}
try {
    likedPapers = JSON.parse(localStorage.getItem('likedPapers')) || [];
} catch (e) {
    likedPapers = [];
}
let currentPaperForShare = null;
let currentPreviewPaper = null;
let searchFallbackActive = false;
let searchFallbackQuery = '';

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
        // Use the public API endpoint instead of the admin one
        console.log('Fetching from /api/papers/public...');
        const response = await fetch('/api/papers/public');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        // Handle different response formats
        if (data.success && Array.isArray(data.data)) {
            allPapers = data.data;
            console.log('Set allPapers from data.data, length:', allPapers.length);
        } else if (Array.isArray(data)) {
            allPapers = data;
            console.log('Set allPapers from data array, length:', allPapers.length);
        } else if (data.data && Array.isArray(data.data)) {
            allPapers = data.data;
            console.log('Set allPapers from data.data (fallback), length:', allPapers.length);
        } else {
            console.warn('Unexpected data format:', data);
            allPapers = [];
        }
        
        // After loading papers, update UI
        console.log('About to call populateSubjectFilter, filterPapers, updateStats');
        populateSubjectFilter();
        filterPapers(); // This will set filteredPapers and call displayPapers
        updateStats();
        
        // Get ratings and interactions for each paper
        // Temporarily disabled to fix loading issue
        /*
        const papersWithStats = await Promise.all(allPapers.map(async (paper) => {
            try {
                const ratingResponse = await fetch(`/api/papers/${paper.id}/rating`);
                const ratingData = await ratingResponse.json();
                
                return {
                    ...paper,
                    averageRating: ratingData.success ? ratingData.data.averageRating : 0,
                    totalRatings: ratingData.success ? ratingData.data.totalRatings : 0,
                    views: ratingData.success ? ratingData.data.views : 0,
                    likes: ratingData.success ? ratingData.data.likes : 0
                };
            } catch (err) {
                console.error('Error getting stats for paper', paper.id, err);
                return {
                    ...paper,
                    averageRating: 0,
                    totalRatings: 0,
                    views: 0,
                    likes: 0
                };
            }
        }));
        
        allPapers = papersWithStats;
        */
        
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
    console.log('Filtering papers... allPapers length:', allPapers.length);

    const searchTerm = normalizeSearchText(document.getElementById('searchInput')?.value || '');
    const year = document.getElementById('yearFilter')?.value || '';
    const level = document.getElementById('levelFilter')?.value || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    const subject = document.getElementById('subjectFilter')?.value || '';
    const trade = normalizeSearchText(document.getElementById('tradeFilter')?.value || '');

    searchFallbackActive = false;
    searchFallbackQuery = searchTerm;

    const matchesActiveFilters = (paper) => {
        const paperTrade = normalizeSearchText(paper.trade_or_combination || '');

        const matchesYear = !year || paper.year?.toString() === year;
        const matchesLevel = !level || paper.level === level;
        const matchesCategory = !category || paper.category === category;
        const matchesSubject = !subject || paper.subject === subject;
        const matchesTrade = !trade || fuzzySearch(trade, paperTrade);

        return matchesYear && matchesLevel && matchesCategory && matchesSubject && matchesTrade;
    };

    const filterMatchedPapers = allPapers.filter(matchesActiveFilters);

    if (!searchTerm) {
        filteredPapers = filterMatchedPapers;
    } else {
        filteredPapers = filterMatchedPapers
            .map(paper => ({ paper, score: scorePaperSearch(searchTerm, paper) }))
            .filter(result => result.score >= 0.52)
            .sort((a, b) => b.score - a.score)
            .map(result => result.paper);

        if (filteredPapers.length === 0) {
            searchFallbackActive = true;
            filteredPapers = allPapers
                .map(paper => ({ paper, score: scorePaperSearch(searchTerm, paper) }))
                .filter(result => result.score >= 0.28)
                .sort((a, b) => b.score - a.score)
                .slice(0, itemsPerPage)
                .map(result => result.paper);
        }
    }

    console.log(`Filtered to ${filteredPapers.length} papers`);
    console.log('First few filtered papers:', filteredPapers.slice(0, 3));
    
    // Reset to first page
    currentPage = 1;
    displayPapers();
}

function displayPapers() {
    const container = document.getElementById('papersContainer');
    if (!container) return;

    try {
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
        const suggestionMessage = searchFallbackActive ? `
            <div class="search-suggestion">
                <i class="fas fa-lightbulb"></i>
                <span>No exact paper found for "${escapeHtml(searchFallbackQuery)}". Showing the closest available papers.</span>
            </div>
        ` : '';

        container.innerHTML = suggestionMessage + paginatedPapers.map(paper => {
        const isBookmarked = bookmarks.includes(paper.id);
        const isLiked = likedPapers.includes(paper.id);
        const fileUrl = paper.file_path ? `/${paper.file_path.replace(/\\/g, '/')}` : '#';
        const ratingStars = generateRatingStars(Number(paper.averageRating) || 0);
        const totalRatings = Number(paper.totalRatings) || 0;
        const views = Number(paper.views) || 0;
        const likes = (Number(paper.likes) || 0) + (isLiked && !paper.likes ? 1 : 0);
        const subject = escapeHtml(paper.subject || 'Untitled paper');
        const level = escapeHtml(paper.level || 'Unknown level');
        const category = escapeHtml(paper.category || 'General');
        const categoryClass = cssClassName(paper.category || 'General');
        const trade = escapeHtml(paper.trade_or_combination || '');
        const year = escapeHtml(String(paper.year || ''));
        
        if (currentView === 'grid') {
            return `
                <div class="paper-card grid" data-id="${paper.id}">
                    <div class="paper-header">
                        <span class="paper-type ${categoryClass}">
                            ${category}
                        </span>
                        <span class="paper-year">${year}</span>
                    </div>
                    <div class="paper-body">
                        <h3>${subject}</h3>
                        <div class="paper-meta">
                            <span><i class="fas fa-graduation-cap"></i> ${level}</span>
                            ${paper.trade_or_combination ? 
                                `<span><i class="fas fa-tag"></i> ${trade}</span>` : ''}
                        </div>
                        <div class="paper-stats">
                            <div class="rating">
                                ${ratingStars}
                                <span class="rating-text">${paper.averageRating > 0 ? paper.averageRating : 'No rating'} (${totalRatings})</span>
                            </div>
                            <div class="interactions">
                                <span><i class="fas fa-eye"></i> ${views}</span>
                                <span><i class="fas fa-heart"></i> ${likes}</span>
                                <span><i class="fas fa-download"></i> ${paper.download_count || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div class="paper-actions">
                        <button class="action-btn download" onclick="downloadPaper(${paper.id}, '${fileUrl}')" title="Download">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="action-btn like ${isLiked ? 'active' : ''}" onclick="likePaper(${paper.id})" title="Like">
                            <i class="fas fa-heart"></i>
                        </button>
                        <button class="action-btn comment" onclick="showComments(${paper.id}, '${subject}')" title="Comments">
                            <i class="fas fa-comment"></i>
                        </button>
                        <button class="action-btn share" onclick="sharePaper(${paper.id})" title="Share">
                            <i class="fas fa-share-alt"></i>
                        </button>
                        <button class="action-btn preview wide" onclick="previewPaper(${paper.id})" title="View Paper">
                            <i class="fas fa-eye"></i>
                            <span>View</span>
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
                        <span class="paper-type ${categoryClass}">
                            ${category}
                        </span>
                    </div>
                    <div class="paper-body">
                        <h3>${subject}</h3>
                        <div class="paper-meta">
                            <span><i class="fas fa-calendar"></i> ${year}</span>
                            <span><i class="fas fa-graduation-cap"></i> ${level}</span>
                            ${paper.trade_or_combination ? 
                                `<span><i class="fas fa-tag"></i> ${trade}</span>` : ''}
                        </div>
                        <div class="paper-stats">
                            <div class="rating">
                                ${ratingStars}
                                <span class="rating-text">${paper.averageRating > 0 ? paper.averageRating : 'No rating'} (${totalRatings})</span>
                            </div>
                            <div class="interactions">
                                <span><i class="fas fa-eye"></i> ${views}</span>
                                <span><i class="fas fa-heart"></i> ${likes}</span>
                                <span><i class="fas fa-download"></i> ${paper.download_count || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div class="paper-actions">
                        <button class="action-btn download" onclick="downloadPaper(${paper.id}, '${fileUrl}')" title="Download">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="action-btn like ${isLiked ? 'active' : ''}" onclick="likePaper(${paper.id})" title="Like">
                            <i class="fas fa-heart"></i>
                        </button>
                        <button class="action-btn comment" onclick="showComments(${paper.id}, '${subject}')" title="Comments">
                            <i class="fas fa-comment"></i>
                        </button>
                        <button class="action-btn share" onclick="sharePaper(${paper.id})" title="Share">
                            <i class="fas fa-share-alt"></i>
                        </button>
                        <button class="action-btn preview wide" onclick="previewPaper(${paper.id})" title="View Paper">
                            <i class="fas fa-eye"></i>
                            <span>View</span>
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
    } catch (error) {
        console.error('Error displaying papers:', error);
        container.className = 'papers-container';
        container.innerHTML = `
            <div class="error-container">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Could not display papers</h3>
                <p>${escapeHtml(error.message)}</p>
                <button onclick="loadPapers()" class="btn-primary">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
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
    const trigger = window.event?.target?.closest('a');
    if (trigger) trigger.classList.add('active');
    
    if (category === 'all') {
        await loadPapers();
    } else {
        try {
            const response = await fetch(`/api/papers/public/category/${encodeURIComponent(category)}`);
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
    const trigger = window.event?.target?.closest('a');
    if (trigger) trigger.classList.add('active');
    
    try {
        const response = await fetch(`/api/papers/public/level/${encodeURIComponent(level)}`);
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
    const trigger = window.event?.target?.closest('a');
    if (trigger) trigger.classList.add('active');
    
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
    const trigger = window.event?.target?.closest('.view-option');
    if (trigger) trigger.classList.add('active');
    
    displayPapers();
}

// ========================================
// PAPER ACTIONS
// ========================================

async function downloadPaper(id, fileUrl) {
    try {
        const downloadUrl = `/api/papers/${id}/download`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = '';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        showNotification('Download started', 'success');
    } catch (error) {
        console.error('Error tracking download:', error);
        window.location.href = fileUrl;
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

function previewPaper(paperId) {
    const paper = allPapers.find(item => item.id === paperId) || filteredPapers.find(item => item.id === paperId);
    if (!paper?.file_path) {
        showNotification('Paper file is not available', 'error');
        return;
    }

    currentPreviewPaper = paper;
    const fileUrl = `/${paper.file_path.replace(/\\/g, '/')}`;
    const title = `${paper.subject || 'Paper'} ${paper.year ? `(${paper.year})` : ''}`;

    document.getElementById('previewFrame').src = fileUrl;
    document.getElementById('previewTitle').textContent = title;
    document.getElementById('previewSubtitle').textContent = [paper.level, paper.category, paper.trade_or_combination].filter(Boolean).join(' • ');
    document.getElementById('previewLikeBtn')?.classList.toggle('active', likedPapers.includes(paper.id));
    document.getElementById('previewBookmarkBtn')?.classList.toggle('active', bookmarks.includes(paper.id));
    document.body.classList.add('viewer-open');
    document.getElementById('previewModal').classList.add('active');
    recordPaperInteraction(paper.id, 'view').catch(error => console.error('Error recording view:', error));
}

function closePreview() {
    document.getElementById('previewModal').classList.remove('active');
    document.getElementById('previewFrame').src = '';
    document.body.classList.remove('viewer-open');
    currentPreviewPaper = null;
}

function downloadCurrentPreviewPaper() {
    if (!currentPreviewPaper) return;
    const fileUrl = `/${currentPreviewPaper.file_path.replace(/\\/g, '/')}`;
    downloadPaper(currentPreviewPaper.id, fileUrl);
}

function likeCurrentPreviewPaper() {
    if (!currentPreviewPaper) return;
    likePaper(currentPreviewPaper.id);
    document.getElementById('previewLikeBtn')?.classList.toggle('active', likedPapers.includes(currentPreviewPaper.id));
}

function commentCurrentPreviewPaper() {
    if (!currentPreviewPaper) return;
    showComments(currentPreviewPaper.id, escapeHtml(currentPreviewPaper.subject || 'Paper'));
}

function shareCurrentPreviewPaper() {
    if (!currentPreviewPaper) return;
    sharePaper(currentPreviewPaper.id);
}

function bookmarkCurrentPreviewPaper() {
    if (!currentPreviewPaper) return;
    toggleBookmark(currentPreviewPaper.id);
    document.getElementById('previewBookmarkBtn')?.classList.toggle('active', bookmarks.includes(currentPreviewPaper.id));
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
        recordPaperInteraction(id, 'bookmark');
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
    const trigger = window.event?.target?.closest('a');
    if (trigger) trigger.classList.add('active');
}

// ========================================
// RATING AND INTERACTION FUNCTIONS
// ========================================

function generateRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    return stars;
}

async function likePaper(paperId) {
    const index = likedPapers.indexOf(paperId);
    if (index === -1) {
        likedPapers.push(paperId);
        showNotification('Paper liked!', 'success');
    } else {
        likedPapers.splice(index, 1);
        showNotification('Like removed', 'warning');
    }

    localStorage.setItem('likedPapers', JSON.stringify(likedPapers));
    displayPapers();

    try {
        const userIdentifier = localStorage.getItem('userIdentifier') || generateUserIdentifier();
        localStorage.setItem('userIdentifier', userIdentifier);
        
        await recordPaperInteraction(paperId, 'like', userIdentifier);
    } catch (error) {
        console.error('Error liking paper:', error);
    }
}

async function recordPaperInteraction(paperId, type, userIdentifier = null) {
    await fetch(`/api/papers/${paperId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, userIdentifier })
    });
}

function generateUserIdentifier() {
    return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// ========================================
// COMMENT FUNCTIONS
// ========================================

async function showComments(paperId, paperTitle) {
    try {
        const response = await fetch(`/api/papers/${paperId}/comments`);
        const data = await response.json();
        
        if (data.success) {
            displayCommentsModal(paperId, paperTitle, data.data);
        } else {
            showNotification('Failed to load comments', 'error');
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        showNotification('Failed to load comments', 'error');
    }
}

function displayCommentsModal(paperId, paperTitle, comments) {
    const modal = document.createElement('div');
    modal.className = 'modal comments-modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Comments for ${paperTitle}</h3>
                <button class="modal-close" onclick="closeCommentsModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="comments-list" id="commentsList">
                    ${comments.length > 0 ? 
                        comments.map(comment => `
                            <div class="comment-item">
                                <div class="comment-header">
                                    <strong>${comment.student_name}</strong>
                                    <span class="comment-date">${new Date(comment.created_at).toLocaleDateString()}</span>
                                    ${comment.rating ? `<div class="comment-rating">${generateRatingStars(comment.rating)}</div>` : ''}
                                </div>
                                <div class="comment-content">${comment.comment}</div>
                                <div class="comment-actions">
                                    <button class="like-btn" onclick="likeComment(${comment.id})">
                                        <i class="fas fa-thumbs-up"></i> ${comment.likes || 0}
                                    </button>
                                </div>
                            </div>
                        `).join('') : 
                        '<p class="no-comments">No comments yet. Be the first to comment!</p>'
                    }
                </div>
                <div class="add-comment-form">
                    <h4>Add Your Comment</h4>
                    <form id="commentForm" onsubmit="submitComment(event, ${paperId})">
                        <div class="form-group">
                            <input type="text" id="commentName" placeholder="Your Name" required>
                        </div>
                        <div class="form-group">
                            <input type="email" id="commentEmail" placeholder="Your Email" required>
                        </div>
                        <div class="form-group">
                            <div class="rating-input">
                                <label>Rating (optional):</label>
                                <div class="stars" id="ratingStars">
                                    ${[1,2,3,4,5].map(num => `
                                        <i class="far fa-star" data-rating="${num}" onclick="setRating(${num})"></i>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        <div class="form-group">
                            <textarea id="commentText" placeholder="Write your comment..." rows="4" required></textarea>
                        </div>
                        <button type="submit" class="btn-primary">Submit Comment</button>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeCommentsModal() {
    const modal = document.querySelector('.comments-modal');
    if (modal) {
        modal.remove();
    }
}

async function submitComment(event, paperId) {
    event.preventDefault();
    
    const name = document.getElementById('commentName').value.trim();
    const email = document.getElementById('commentEmail').value.trim();
    const comment = document.getElementById('commentText').value.trim();
    const rating = document.querySelector('.stars i.fas')?.dataset.rating || null;
    
    if (!name || !email || !comment) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/papers/${paperId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_name: name,
                student_email: email,
                comment: comment,
                rating: rating ? parseInt(rating) : null
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Comment added successfully!', 'success');
            closeCommentsModal();
            // Refresh papers to update comment count if we add it
            loadPapers();
        } else {
            showNotification(data.message || 'Failed to add comment', 'error');
        }
    } catch (error) {
        console.error('Error submitting comment:', error);
        showNotification('Failed to add comment', 'error');
    }
}

function setRating(rating) {
    const stars = document.querySelectorAll('#ratingStars i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.className = 'fas fa-star';
        } else {
            star.className = 'far fa-star';
        }
    });
}

async function likeComment(commentId) {
    try {
        const response = await fetch(`/api/papers/comments/${commentId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'like' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update the like count in the UI
            const likeBtn = window.event?.target?.closest('.like-btn');
            if (likeBtn) {
                const icon = likeBtn.querySelector('i');
                const count = likeBtn.textContent.trim().split(' ').pop();
                likeBtn.innerHTML = `<i class="fas fa-thumbs-up"></i> ${data.likes}`;
            }
        }
    } catch (error) {
        console.error('Error liking comment:', error);
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function fuzzySearch(query, ...texts) {
    query = normalizeSearchText(query);
    texts = texts.map(normalizeSearchText);

    if (!query) return true;

    // Split query into words for multi-word search
    const queryWords = query.split(/\s+/).filter(word => word.length > 0);

    // Check if any text contains all query words (with fuzzy matching)
    return texts.some(text => {
        return queryWords.every(queryWord => {
            // Direct substring match (fastest)
            if (text.includes(queryWord)) return true;

            // Fuzzy match with Levenshtein distance
            const words = text.split(/\s+/);
            return words.some(word => levenshteinDistance(queryWord, word) <= Math.min(2, Math.floor(queryWord.length / 3)));
        });
    });
}

function scorePaperSearch(query, paper) {
    const queryTerms = buildSearchAliases(normalizeSearchText(query));
    const texts = getPaperSearchTexts(paper);

    if (queryTerms.length === 0) return 1;

    const termScores = queryTerms.map(term => {
        let bestScore = 0;

        texts.forEach(text => {
            if (!text) return;

            if (text === term) {
                bestScore = Math.max(bestScore, 1);
            } else if (text.includes(term)) {
                bestScore = Math.max(bestScore, 0.9);
            } else if (term.includes(text) && text.length >= 3) {
                bestScore = Math.max(bestScore, 0.78);
            }

            text.split(/\s+/).forEach(word => {
                if (!word) return;
                const distance = levenshteinDistance(term, word);
                const longest = Math.max(term.length, word.length);
                const similarity = longest === 0 ? 0 : 1 - (distance / longest);

                if (similarity >= 0.72) {
                    bestScore = Math.max(bestScore, similarity);
                }
            });
        });

        return bestScore;
    });

    const averageScore = termScores.reduce((sum, score) => sum + score, 0) / termScores.length;
    const allTermsUseful = termScores.every(score => score >= 0.45);

    return allTermsUseful ? averageScore : averageScore * 0.65;
}

function getPaperSearchTexts(paper) {
    return [
        paper.subject,
        paper.trade_or_combination,
        paper.level,
        paper.category,
        paper.year
    ]
        .flatMap(value => buildSearchAliases(normalizeSearchText(value || '')))
        .filter(Boolean);
}

function buildSearchAliases(value) {
    const words = normalizeSearchText(value).split(/\s+/).filter(Boolean);
    const aliases = new Set([normalizeSearchText(value), ...words]);

    words.forEach(word => {
        if (['math', 'maths', 'mathematic', 'mathematics', 'mathmatics'].includes(word)) {
            aliases.add('math');
            aliases.add('maths');
            aliases.add('mathematics');
        }

        if (['english', 'eng'].includes(word)) {
            aliases.add('english');
            aliases.add('eng');
        }

        if (['biology', 'bio'].includes(word)) {
            aliases.add('biology');
            aliases.add('bio');
        }

        if (['chemistry', 'chem'].includes(word)) {
            aliases.add('chemistry');
            aliases.add('chem');
        }

        if (['physics', 'physic', 'phy'].includes(word)) {
            aliases.add('physics');
            aliases.add('phy');
        }
    });

    return [...aliases].filter(Boolean);
}

function normalizeSearchText(value) {
    return String(value)
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

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

function toggleStudentProfile() {
    showNotification('Coming soon', 'warning');
}

function toggleNotifications() {
    showNotification('Coming soon', 'warning');
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function cssClassName(value) {
    const className = normalizeSearchText(value).replace(/\s+/g, '-');
    return className || 'general';
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
window.downloadCurrentPreviewPaper = downloadCurrentPreviewPaper;
window.likeCurrentPreviewPaper = likeCurrentPreviewPaper;
window.commentCurrentPreviewPaper = commentCurrentPreviewPaper;
window.shareCurrentPreviewPaper = shareCurrentPreviewPaper;
window.bookmarkCurrentPreviewPaper = bookmarkCurrentPreviewPaper;
window.toggleBookmark = toggleBookmark;
window.showBookmarks = showBookmarks;
window.changePage = changePage;
window.refreshPapers = refreshPapers;
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareViaEmail = shareViaEmail;
window.copyLink = copyLink;
window.closeShareModal = closeShareModal;
window.loadPapers = loadPapers;
window.likePaper = likePaper;
window.showComments = showComments;
window.closeCommentsModal = closeCommentsModal;
window.submitComment = submitComment;
window.setRating = setRating;
window.likeComment = likeComment;
window.toggleStudentProfile = toggleStudentProfile;
window.toggleNotifications = toggleNotifications;
