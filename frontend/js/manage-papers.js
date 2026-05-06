// Global variables
let allPapers = [];
let filteredPapers = [];
let currentPage = 1;
const itemsPerPage = 10;
let paperToDelete = null;
let editingId = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Manage Papers page initialized');
    initializePage();
    setupEventListeners();
    loadPapers();
});

function initializePage() {
    // Populate year filter
    const yearFilter = document.getElementById('yearFilter');
    if (yearFilter) {
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= 2000; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearFilter.appendChild(option);
        }
    }
    
    // Category change handler for trade field
    document.getElementById('category')?.addEventListener('change', function(e) {
        const tradeField = document.getElementById('trade_or_combination');
        const tradeLabel = tradeField?.previousElementSibling;
        
        if (e.target.value === 'TVET') {
            tradeField.placeholder = 'e.g., Plumbing, Carpentry, Electricity';
            if (tradeLabel) tradeLabel.innerHTML = 'Trade <span class="required">*</span>';
            tradeField.required = true;
        } else if (e.target.value === 'General') {
            tradeField.placeholder = 'e.g., PCM, MCB, History (for A-Level combinations)';
            if (tradeLabel) tradeLabel.innerHTML = 'Combination (Optional)';
            tradeField.required = false;
        } else {
            tradeField.placeholder = 'e.g., PCM, MCB, Plumbing';
            tradeField.required = false;
        }
    });
}

function setupEventListeners() {
    // Add paper button
    document.getElementById('addPaperBtn')?.addEventListener('click', openAddModal);
    
    // Modal close buttons
    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
    document.getElementById('cancelModalBtn')?.addEventListener('click', closeModal);
    document.getElementById('closeDeleteModalBtn')?.addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDeleteBtn')?.addEventListener('click', closeDeleteModal);
    document.getElementById('closeViewModalBtn')?.addEventListener('click', closeViewModal);
    
    // Form submission
    document.getElementById('paperForm')?.addEventListener('submit', handleFormSubmit);
    
    // File upload
    const fileInput = document.getElementById('file');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const removeFileBtn = document.getElementById('removeFileBtn');
    
    if (fileInput && fileUploadArea) {
        fileInput.addEventListener('change', handleFileSelect);
        fileUploadArea.addEventListener('click', () => fileInput.click());
        fileUploadArea.addEventListener('dragover', handleDragOver);
        fileUploadArea.addEventListener('dragleave', handleDragLeave);
        fileUploadArea.addEventListener('drop', handleFileDrop);
    }
    
    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', removeSelectedFile);
    }
    
    // Filters
    document.getElementById('searchInput')?.addEventListener('input', debounce(filterPapers, 300));
    document.getElementById('yearFilter')?.addEventListener('change', filterPapers);
    document.getElementById('levelFilter')?.addEventListener('change', filterPapers);
    document.getElementById('categoryFilter')?.addEventListener('change', filterPapers);
    document.getElementById('subjectFilter')?.addEventListener('change', filterPapers);
    document.getElementById('tradeFilter')?.addEventListener('input', debounce(filterPapers, 300));
    document.getElementById('statusFilter')?.addEventListener('change', filterPapers);
    document.getElementById('dateFilter')?.addEventListener('change', filterPapers);
    
    // Pagination
    document.getElementById('prevPage')?.addEventListener('click', () => changePage(-1));
    document.getElementById('nextPage')?.addEventListener('click', () => changePage(1));
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
    });
    
    // Export button
    document.getElementById('exportBtn')?.addEventListener('click', exportToCSV);
}

// ============== PAPER CRUD OPERATIONS ==============

async function loadPapers() {
    showLoading();
    
    try {
        const response = await fetch('/api/admin/papers', {
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/admin/login.html';
                return;
            }
            throw new Error('Failed to load papers');
        }
        
        const result = await response.json();
        
        if (result.success && Array.isArray(result.data)) {
            allPapers = result.data;
        } else if (Array.isArray(result)) {
            allPapers = result;
        } else {
            allPapers = [];
        }
        
        // Populate subject filter
        populateSubjectFilter();
        
        // Update stats
        updateStats();
        
        // Apply filters and display
        filteredPapers = [...allPapers];
        filterPapers();
        
    } catch (error) {
        console.error('Error loading papers:', error);
        showNotification('Failed to load papers: ' + error.message, 'error');
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
    const total = allPapers.length;
    const active = allPapers.filter(p => p.status === 'active').length;
    const general = allPapers.filter(p => p.category === 'General').length;
    const tvet = allPapers.filter(p => p.category === 'TVET').length;
    
    document.getElementById('totalPapersCount').textContent = total;
    document.getElementById('activePapersCount').textContent = active;
    document.getElementById('generalCount').textContent = general;
    document.getElementById('tvetCount').textContent = tvet;
}

function filterPapers() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const year = document.getElementById('yearFilter')?.value || '';
    const level = document.getElementById('levelFilter')?.value || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    const subject = document.getElementById('subjectFilter')?.value || '';
    const trade = document.getElementById('tradeFilter')?.value.toLowerCase() || '';
    const status = document.getElementById('statusFilter')?.value || '';
    const dateFilter = document.getElementById('dateFilter')?.value || '';
    
    filteredPapers = allPapers.filter(paper => {
        const matchesSearch = paper.subject.toLowerCase().includes(searchTerm) ||
                            (paper.trade_or_combination || '').toLowerCase().includes(searchTerm);
        const matchesYear = !year || paper.year.toString() === year;
        const matchesLevel = !level || paper.level === level;
        const matchesCategory = !category || paper.category === category;
        const matchesSubject = !subject || paper.subject === subject;
        const matchesTrade = !trade || (paper.trade_or_combination || '').toLowerCase().includes(trade);
        const matchesStatus = !status || paper.status === status;
        
        // Date filtering
        let matchesDate = true;
        if (dateFilter && paper.created_at) {
            const paperDate = new Date(paper.created_at);
            const today = new Date();
            
            switch(dateFilter) {
                case 'today':
                    matchesDate = paperDate.toDateString() === today.toDateString();
                    break;
                case 'week':
                    const weekAgo = new Date(today.setDate(today.getDate() - 7));
                    matchesDate = paperDate >= weekAgo;
                    break;
                case 'month':
                    const monthAgo = new Date(today.setMonth(today.getMonth() - 1));
                    matchesDate = paperDate >= monthAgo;
                    break;
                case 'year':
                    const yearAgo = new Date(today.setFullYear(today.getFullYear() - 1));
                    matchesDate = paperDate >= yearAgo;
                    break;
            }
        }
        
        return matchesSearch && matchesYear && matchesLevel && matchesCategory && 
               matchesSubject && matchesTrade && matchesStatus && matchesDate;
    });
    
    currentPage = 1;
    displayPapers();
}

function displayPapers() {
    const tbody = document.getElementById('papersTableBody');
    if (!tbody) return;
    
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedPapers = filteredPapers.slice(start, start + itemsPerPage);
    
    if (paginatedPapers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
                    <i class="fas fa-folder-open" style="font-size: 2rem; color: #4a5568;"></i>
                    <p>No papers found</p>
                </td>
            </tr>
        `;
        updatePagination(0);
        return;
    }
    
    tbody.innerHTML = paginatedPapers.map(paper => {
        const fileUrl = paper.file_path ? `/${paper.file_path.replace(/\\/g, '/')}` : '#';
        const category = paper.category || 'General';
        const trade = paper.trade_or_combination || '-';
        
        return `
            <tr>
                <td>${paper.id}</td>
                <td>${paper.year}</td>
                <td><strong>${paper.subject}</strong></td>
                <td>${paper.level}</td>
                <td>
                    <span class="category-badge category-${category.toLowerCase()}">
                        ${category}
                    </span>
                </td>
                <td>
                    ${trade !== '-' ? `<span class="trade-badge">${trade}</span>` : '-'}
                </td>
                <td>
                    <a href="${fileUrl}" target="_blank" class="download-link">
                        <i class="fas fa-file-pdf"></i> View PDF
                    </a>
                </td>
                <td>
                    <span class="status-badge ${paper.status === 'active' ? 'status-active' : 'status-inactive'}">
                        ${paper.status}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="viewPaper(${paper.id})" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="editPaper(${paper.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn toggle ${paper.status === 'active' ? 'deactivate' : 'activate'}" 
                                onclick="toggleStatus(${paper.id})" 
                                title="${paper.status === 'active' ? 'Deactivate' : 'Activate'}">
                            <i class="fas fa-${paper.status === 'active' ? 'eye-slash' : 'eye'}"></i>
                        </button>
                        <button class="action-btn delete" onclick="openDeleteModal(${paper.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
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
    }
}

// ============== MODAL FUNCTIONS ==============

function openAddModal() {
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Add New Paper';
    document.getElementById('paperForm').reset();
    document.getElementById('statusGroup').style.display = 'none';
    document.getElementById('fileRequired').style.display = 'inline';
    document.getElementById('fileUploadGroup').style.display = 'block';
    removeSelectedFile();
    document.getElementById('paperModal').classList.add('active');
}

function editPaper(id) {
    const paper = allPapers.find(p => p.id === id);
    if (!paper) return;
    
    editingId = id;
    document.getElementById('modalTitle').textContent = 'Edit Paper';
    document.getElementById('year').value = paper.year;
    document.getElementById('subject').value = paper.subject;
    document.getElementById('level').value = paper.level;
    document.getElementById('category').value = paper.category || 'General';
    document.getElementById('trade_or_combination').value = paper.trade_or_combination || '';
    document.getElementById('status').value = paper.status;
    
    // Trigger category change to update trade field
    const event = new Event('change');
    document.getElementById('category').dispatchEvent(event);
    
    document.getElementById('statusGroup').style.display = 'block';
    document.getElementById('fileRequired').style.display = 'none';
    
    if (paper.file_path) {
        const fileName = paper.file_path.split('/').pop();
        document.getElementById('fileName').textContent = `Current: ${fileName}`;
        document.getElementById('fileSize').textContent = '(existing file)';
        document.getElementById('fileUploadArea').style.display = 'none';
        document.getElementById('fileInfo').style.display = 'flex';
    }
    
    document.getElementById('paperModal').classList.add('active');
}

function viewPaper(id) {
    const paper = allPapers.find(p => p.id === id);
    if (!paper) return;
    
    const detailsDiv = document.getElementById('paperDetails');
    detailsDiv.innerHTML = `
        <div style="padding: 20px;">
            <p><strong>ID:</strong> ${paper.id}</p>
            <p><strong>Year:</strong> ${paper.year}</p>
            <p><strong>Subject:</strong> ${paper.subject}</p>
            <p><strong>Level:</strong> ${paper.level}</p>
            <p><strong>Category:</strong> ${paper.category || 'General'}</p>
            <p><strong>Trade/Combination:</strong> ${paper.trade_or_combination || '-'}</p>
            <p><strong>Status:</strong> <span class="status-badge ${paper.status === 'active' ? 'status-active' : 'status-inactive'}">${paper.status}</span></p>
            <p><strong>Created:</strong> ${new Date(paper.created_at).toLocaleString()}</p>
            <p><strong>File:</strong> ${paper.file_path}</p>
            <p><strong>Downloads:</strong> ${paper.download_count || 0}</p>
        </div>
    `;
    
    document.getElementById('viewModal').classList.add('active');
}

function closeModal() {
    document.getElementById('paperModal').classList.remove('active');
    editingId = null;
    removeSelectedFile();
}

function closeViewModal() {
    document.getElementById('viewModal').classList.remove('active');
}

function openDeleteModal(id) {
    const paper = allPapers.find(p => p.id === id);
    if (!paper) return;
    
    paperToDelete = id;
    document.getElementById('deletePaperInfo').textContent = 
        `${paper.subject} (${paper.year} - ${paper.level})`;
    document.getElementById('deleteModal').classList.add('active');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    paperToDelete = null;
}

// ============== FORM HANDLING ==============

async function handleFormSubmit(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('savePaperBtn');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        const formData = new FormData();
        formData.append('year', document.getElementById('year').value);
        formData.append('subject', document.getElementById('subject').value);
        formData.append('level', document.getElementById('level').value);
        formData.append('category', document.getElementById('category').value);
        formData.append('trade_or_combination', document.getElementById('trade_or_combination').value);
        
        const file = document.getElementById('file').files[0];
        if (file) {
            formData.append('file', file);
        }
        
        if (editingId) {
            formData.append('status', document.getElementById('status').value);
        }
        
        // Validate
        if (!editingId && !file) {
            throw new Error('Please select a PDF file');
        }
        
        // Validate trade for TVET
        const category = document.getElementById('category').value;
        const trade = document.getElementById('trade_or_combination').value;
        if (category === 'TVET' && !trade) {
            throw new Error('Trade is required for TVET papers');
        }
        
        const url = editingId ? `/api/admin/papers/${editingId}` : '/api/admin/papers';
        const method = editingId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            body: formData,
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to save paper');
        }
        
        showNotification(`Paper ${editingId ? 'updated' : 'added'} successfully`, 'success');
        closeModal();
        await loadPapers();
        
    } catch (error) {
        console.error('Error saving paper:', error);
        showNotification(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

async function toggleStatus(id) {
    const paper = allPapers.find(p => p.id === id);
    if (!paper) return;
    
    const newStatus = paper.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';
    
    if (!confirm(`Are you sure you want to ${action} this paper?`)) return;
    
    try {
        const response = await fetch(`/api/admin/papers/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...paper,
                status: newStatus
            }),
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to update status');
        }
        
        showNotification(`Paper ${action}d successfully`, 'success');
        await loadPapers();
        
    } catch (error) {
        console.error('Error updating status:', error);
        showNotification('Failed to update status', 'error');
    }
}

async function confirmDelete() {
    if (!paperToDelete) return;
    
    const deleteBtn = document.getElementById('confirmDeleteBtn');
    const originalText = deleteBtn.innerHTML;
    
    try {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        
        const response = await fetch(`/api/admin/papers/${paperToDelete}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete paper');
        }
        
        showNotification('Paper deleted successfully', 'success');
        closeDeleteModal();
        await loadPapers();
        
    } catch (error) {
        console.error('Error deleting paper:', error);
        showNotification('Failed to delete paper', 'error');
    } finally {
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = originalText;
    }
}

// ============== FILE HANDLING ==============

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) validateAndDisplayFile(file);
}

function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('fileUploadArea')?.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('fileUploadArea')?.classList.remove('drag-over');
}

function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('fileUploadArea')?.classList.remove('drag-over');
    
    const file = event.dataTransfer.files[0];
    if (file) {
        document.getElementById('file').files = event.dataTransfer.files;
        validateAndDisplayFile(file);
    }
}

function validateAndDisplayFile(file) {
    if (file.type !== 'application/pdf') {
        showNotification('Please select a PDF file', 'error');
        document.getElementById('file').value = '';
        return;
    }
    
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        showNotification('File size must be less than 10MB', 'error');
        document.getElementById('file').value = '';
        return;
    }
    
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = `(${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    document.getElementById('fileUploadArea').style.display = 'none';
    document.getElementById('fileInfo').style.display = 'flex';
}

function removeSelectedFile() {
    document.getElementById('file').value = '';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('fileUploadArea').style.display = 'block';
}

// ============== FILTER FUNCTIONS ==============

function applyFilters() {
    filterPapers();
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('yearFilter').value = '';
    document.getElementById('levelFilter').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('subjectFilter').value = '';
    document.getElementById('tradeFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('dateFilter').value = '';
    
    filterPapers();
}

// ============== EXPORT FUNCTION ==============

function exportToCSV() {
    const headers = ['ID', 'Year', 'Subject', 'Level', 'Category', 'Trade/Combination', 'Status', 'Created'];
    const csvRows = [];
    
    csvRows.push(headers.join(','));
    
    filteredPapers.forEach(paper => {
        const row = [
            paper.id,
            paper.year,
            `"${paper.subject}"`,
            paper.level,
            paper.category || 'General',
            paper.trade_or_combination || '-',
            paper.status,
            new Date(paper.created_at).toLocaleDateString()
        ];
        csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `papers_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification('Export started', 'success');
}

// ============== UTILITY FUNCTIONS ==============

function showLoading() {
    const tbody = document.getElementById('papersTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
                    <div class="loading-spinner"></div>
                    <p>Loading papers...</p>
                </td>
            </tr>
        `;
    }
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

function showNotification(message, type) {
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

// Make functions globally available
window.editPaper = editPaper;
window.viewPaper = viewPaper;
window.toggleStatus = toggleStatus;
window.openDeleteModal = openDeleteModal;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.closeViewModal = closeViewModal;