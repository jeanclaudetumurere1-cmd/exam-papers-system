const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const originalName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '_' + originalName);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});

function getDirectorySize(dir) {
    if (!fs.existsSync(dir)) return { files: 0, bytes: 0 };

    return fs.readdirSync(dir, { withFileTypes: true }).reduce((totals, entry) => {
        const entryPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            const childTotals = getDirectorySize(entryPath);
            return {
                files: totals.files + childTotals.files,
                bytes: totals.bytes + childTotals.bytes
            };
        }

        if (entry.isFile()) {
            const stats = fs.statSync(entryPath);
            return {
                files: totals.files + 1,
                bytes: totals.bytes + stats.size
            };
        }

        return totals;
    }, { files: 0, bytes: 0 });
}

// ============== PUBLIC ROUTES ==============

// GET all active papers for public (root route)
router.get('/', async (req, res) => {
    try {
        console.log('Fetching public papers...');
        
        const [rows] = await db.query(
            'SELECT id, year, subject, level, category, trade_or_combination, file_path FROM exam_papers WHERE status = "active" ORDER BY year DESC, subject ASC'
        );
        
        console.log(`Found ${rows.length} active papers`);
        
        // Get download counts for each paper
        const papersWithStats = await Promise.all(rows.map(async (paper) => {
            try {
                const [downloads] = await db.query(
                    'SELECT COUNT(*) as count FROM downloads WHERE paper_id = ?',
                    [paper.id]
                );
                return {
                    ...paper,
                    download_count: downloads[0]?.count || 0,
                    file_url: `/${paper.file_path.replace(/\\/g, '/')}`
                };
            } catch (err) {
                console.error('Error getting download count for paper', paper.id, err);
                return {
                    ...paper,
                    download_count: 0,
                    file_url: `/${paper.file_path.replace(/\\/g, '/')}`
                };
            }
        }));
        
        res.json({
            success: true,
            data: papersWithStats
        });
        
    } catch (error) {
        console.error('Error in / route:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch papers',
            error: error.message,
            data: []
        });
    }
});

// GET all active papers for public
router.get('/public', async (req, res) => {
    try {
        console.log('Fetching public papers...');
        
        const [rows] = await db.query(
            'SELECT id, year, subject, level, category, trade_or_combination, file_path FROM exam_papers WHERE status = "active" ORDER BY year DESC, subject ASC'
        );
        
        console.log(`Found ${rows.length} active papers`);
        
        // Get download counts for each paper
        const papersWithStats = await Promise.all(rows.map(async (paper) => {
            try {
                const [downloads] = await db.query(
                    'SELECT COUNT(*) as count FROM downloads WHERE paper_id = ?',
                    [paper.id]
                );
                return {
                    ...paper,
                    download_count: downloads[0]?.count || 0,
                    file_url: `/${paper.file_path.replace(/\\/g, '/')}`
                };
            } catch (err) {
                console.error('Error getting download count for paper', paper.id, err);
                return {
                    ...paper,
                    download_count: 0,
                    file_url: `/${paper.file_path.replace(/\\/g, '/')}`
                };
            }
        }));
        
        res.json({
            success: true,
            data: papersWithStats
        });
        
    } catch (error) {
        console.error('Error in /public route:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch papers',
            error: error.message,
            data: []
        });
    }
});

// GET papers by category
router.get('/public/category/:category', async (req, res) => {
    try {
        const category = req.params.category;
        console.log(`Fetching papers for category: ${category}`);
        
        const [rows] = await db.query(
            'SELECT id, year, subject, level, category, trade_or_combination, file_path FROM exam_papers WHERE status = "active" AND category = ? ORDER BY year DESC, subject ASC',
            [category]
        );
        
        res.json({
            success: true,
            data: rows,
            category: category
        });
        
    } catch (error) {
        console.error('Error fetching by category:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch papers',
            data: []
        });
    }
});

// GET papers by level
router.get('/public/level/:level', async (req, res) => {
    try {
        const level = req.params.level;
        console.log(`Fetching papers for level: ${level}`);
        
        const [rows] = await db.query(
            'SELECT id, year, subject, level, category, trade_or_combination, file_path FROM exam_papers WHERE status = "active" AND level = ? ORDER BY year DESC, subject ASC',
            [level]
        );
        
        res.json({
            success: true,
            data: rows,
            level: level
        });
        
    } catch (error) {
        console.error('Error fetching by level:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch papers',
            data: []
        });
    }
});

// ============== ADMIN ROUTES ==============

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

// Admin route - get all student comments and admin replies
router.get('/admin/comments', authenticateToken, async (req, res) => {
    try {
        const Comment = require('../models/Comment');
        const comments = await Comment.getAll();

        res.json({
            success: true,
            data: comments
        });
    } catch (error) {
        console.error('Error fetching admin comments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch comments',
            data: []
        });
    }
});

// Admin route - uploaded file storage summary
router.get('/admin/storage', authenticateToken, async (req, res) => {
    try {
        const [papers] = await db.query(
            'SELECT id, subject, year, file_path FROM exam_papers ORDER BY created_at DESC'
        );

        const uploadStats = getDirectorySize(uploadDir);
        const missingFiles = papers
            .filter(paper => paper.file_path)
            .filter(paper => !fs.existsSync(path.join(__dirname, '..', paper.file_path)))
            .map(paper => ({
                id: paper.id,
                subject: paper.subject,
                year: paper.year,
                file_path: paper.file_path
            }));

        res.json({
            success: true,
            data: {
                uploadFolder: 'backend/uploads',
                publicPath: '/uploads',
                filesOnDisk: uploadStats.files,
                totalBytes: uploadStats.bytes,
                databaseFiles: papers.filter(paper => paper.file_path).length,
                missingFiles
            }
        });
    } catch (error) {
        console.error('Error fetching upload storage summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch upload storage summary',
            data: null
        });
    }
});

// Admin route - reply to a student comment
router.post('/admin/comments/:commentId/reply', authenticateToken, async (req, res) => {
    try {
        const { commentId } = req.params;
        const { reply } = req.body;

        if (!reply || !reply.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Reply is required'
            });
        }

        const Comment = require('../models/Comment');
        const replyId = await Comment.reply(commentId, reply.trim());

        if (!replyId) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        res.json({
            success: true,
            message: 'Reply saved successfully',
            replyId
        });
    } catch (error) {
        console.error('Error replying to comment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save reply: ' + error.message
        });
    }
});

// Admin route - reply endpoint with comment id in body
router.post('/admin/comments/reply', authenticateToken, async (req, res) => {
    try {
        const { commentId, reply } = req.body;

        if (!commentId) {
            return res.status(400).json({
                success: false,
                message: 'Comment id is required'
            });
        }

        if (!reply || !reply.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Reply is required'
            });
        }

        const Comment = require('../models/Comment');
        const replyId = await Comment.reply(commentId, reply.trim());

        if (!replyId) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        res.json({
            success: true,
            message: 'Reply saved successfully',
            replyId
        });
    } catch (error) {
        console.error('Error replying to comment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save reply: ' + error.message
        });
    }
});

// Download a paper without opening it in the browser.
router.get('/:id/download', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, year, subject, level, file_path FROM exam_papers WHERE id = ? AND status = "active"',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Paper not found'
            });
        }

        const paper = rows[0];
        const filePath = path.resolve(__dirname, '..', paper.file_path);
        const uploadsRoot = path.resolve(__dirname, '../uploads');

        if (!filePath.startsWith(uploadsRoot) || !fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Paper file not found'
            });
        }

        if (req.method !== 'HEAD') {
            await db.query('INSERT INTO downloads (paper_id) VALUES (?)', [paper.id]);
        }

        const safeSubject = String(paper.subject || 'exam-paper').replace(/[^a-zA-Z0-9_-]+/g, '_');
        const safeLevel = String(paper.level || '').replace(/[^a-zA-Z0-9_-]+/g, '_');
        const filename = `${paper.year || ''}_${safeLevel}_${safeSubject}.pdf`.replace(/^_+/, '');

        res.download(filePath, filename);
    } catch (error) {
        console.error('Error downloading paper:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download paper'
        });
    }
});

// Get single paper
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM exam_papers WHERE id = ?',
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Paper not found' 
            });
        }
        
        res.json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error('Error fetching paper:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch paper' 
        });
    }
});

// POST new paper
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const { year, subject, level, category, trade_or_combination } = req.body;

        if (!year || !subject || !level || !category) {
            return res.status(400).json({ 
                success: false,
                message: 'Year, subject, level, and category are required' 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                message: 'PDF file is required' 
            });
        }

        const file_path = 'uploads/' + req.file.filename;

        const [result] = await db.query(
            'INSERT INTO exam_papers (year, subject, level, category, trade_or_combination, file_path, status) VALUES (?, ?, ?, ?, ?, ?, "active")',
            [year, subject, level, category, trade_or_combination || null, file_path]
        );

        res.status(201).json({ 
            success: true,
            message: 'Paper added successfully', 
            id: result.insertId
        });

    } catch (error) {
        console.error('Error adding paper:', error);
        
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }

        res.status(500).json({ 
            success: false,
            message: 'Failed to add paper: ' + error.message 
        });
    }
});

// PUT update paper
router.put('/:id', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const { id } = req.params;
        const { year, subject, level, category, trade_or_combination, status } = req.body;

        if (!year || !subject || !level || !category || !status) {
            return res.status(400).json({ 
                success: false,
                message: 'All fields are required' 
            });
        }

        const [existing] = await db.query('SELECT file_path FROM exam_papers WHERE id = ?', [id]);
        
        if (existing.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Paper not found' 
            });
        }

        let file_path = existing[0].file_path;

        if (req.file) {
            const oldFilePath = path.join(__dirname, '..', existing[0].file_path);
            if (fs.existsSync(oldFilePath)) {
                fs.unlink(oldFilePath, (err) => {
                    if (err) console.error('Error deleting old file:', err);
                });
            }
            file_path = 'uploads/' + req.file.filename;
        }

        await db.query(
            'UPDATE exam_papers SET year = ?, subject = ?, level = ?, category = ?, trade_or_combination = ?, file_path = ?, status = ? WHERE id = ?',
            [year, subject, level, category, trade_or_combination || null, file_path, status, id]
        );

        res.json({ 
            success: true,
            message: 'Paper updated successfully'
        });

    } catch (error) {
        console.error('Error updating paper:', error);
        
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }

        res.status(500).json({ 
            success: false,
            message: 'Failed to update paper: ' + error.message 
        });
    }
});

// DELETE paper
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT file_path FROM exam_papers WHERE id = ?', 
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Paper not found' 
            });
        }

        await db.query('DELETE FROM exam_papers WHERE id = ?', [req.params.id]);
        
        const filePath = path.join(__dirname, '..', rows[0].file_path);
        if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }

        res.json({ 
            success: true,
            message: 'Paper deleted successfully' 
        });

    } catch (error) {
        console.error('Error deleting paper:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete paper' 
        });
    }
});

// GET all active papers for public
router.get('/public', async (req, res) => {
    try {
        console.log('Fetching public papers...');
        
        const [rows] = await db.query(
            'SELECT id, year, subject, level, category, trade_or_combination, file_path FROM exam_papers WHERE status = "active" ORDER BY year DESC, subject ASC'
        );
        
        console.log(`Found ${rows.length} active papers`);
        
        // Get download counts for each paper
        const papersWithStats = await Promise.all(rows.map(async (paper) => {
            try {
                const [downloads] = await db.query(
                    'SELECT COUNT(*) as count FROM downloads WHERE paper_id = ?',
                    [paper.id]
                );
                return {
                    ...paper,
                    download_count: downloads[0]?.count || 0,
                    file_url: `/${paper.file_path.replace(/\\/g, '/')}`
                };
            } catch (err) {
                console.error('Error getting download count for paper', paper.id, err);
                return {
                    ...paper,
                    download_count: 0,
                    file_url: `/${paper.file_path.replace(/\\/g, '/')}`
                };
            }
        }));
        
        res.json({
            success: true,
            data: papersWithStats
        });
        
    } catch (error) {
        console.error('Error in /public route:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch papers',
            error: error.message,
            data: []
        });
    }
});

// GET papers by level
router.get('/public/level/:level', async (req, res) => {
    try {
        const level = req.params.level;
        console.log(`Fetching papers for level: ${level}`);
        
        const [rows] = await db.query(
            'SELECT id, year, subject, level, category, trade_or_combination, file_path FROM exam_papers WHERE status = "active" AND level = ? ORDER BY year DESC, subject ASC',
            [level]
        );
        
        res.json({
            success: true,
            data: rows,
            level: level
        });
        
    } catch (error) {
        console.error('Error fetching by level:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch papers',
            data: []
        });
    }
});

// ============== COMMENT ROUTES ==============

// POST add comment to paper
router.post('/:paperId/comments', async (req, res) => {
    try {
        const { paperId } = req.params;
        const { student_name, student_email, comment, rating } = req.body;

        if (!student_name || !student_email || !comment) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and comment are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(student_email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Check if paper exists
        const [paperExists] = await db.query('SELECT id FROM exam_papers WHERE id = ? AND status = "active"', [paperId]);
        if (paperExists.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Paper not found'
            });
        }

        const Comment = require('../models/Comment');
        const commentId = await Comment.create({
            paper_id: paperId,
            student_name,
            student_email,
            comment,
            rating: rating ? parseInt(rating) : null
        });

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            commentId
        });

    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add comment: ' + error.message
        });
    }
});

// GET comments for a paper
router.get('/:paperId/comments', async (req, res) => {
    try {
        const { paperId } = req.params;

        const Comment = require('../models/Comment');
        const comments = await Comment.getByPaperId(paperId);

        res.json({
            success: true,
            data: comments
        });

    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch comments',
            data: []
        });
    }
});

// POST like/unlike comment
router.post('/comments/:commentId/like', async (req, res) => {
    try {
        const { commentId } = req.params;
        const { action } = req.body; // 'like' or 'unlike'

        const Comment = require('../models/Comment');
        const comment = await Comment.getById(commentId);

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        const newLikes = action === 'like' ? comment.likes + 1 : Math.max(0, comment.likes - 1);
        await Comment.updateLikes(commentId, newLikes);

        res.json({
            success: true,
            likes: newLikes
        });

    } catch (error) {
        console.error('Error updating comment likes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update likes'
        });
    }
});

// GET paper rating and stats
router.get('/:paperId/rating', async (req, res) => {
    try {
        const { paperId } = req.params;

        const Comment = require('../models/Comment');
        const rating = await Comment.getAverageRating(paperId);

        const Paper = require('../models/Paper');
        const views = await Paper.getInteractionCount(paperId, 'view');
        const likes = await Paper.getInteractionCount(paperId, 'like');

        res.json({
            success: true,
            data: {
                averageRating: rating.average,
                totalRatings: rating.total,
                views,
                likes
            }
        });

    } catch (error) {
        console.error('Error fetching paper rating:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch rating data'
        });
    }
});

// POST record interaction (view, like, bookmark)
router.post('/:paperId/interact', async (req, res) => {
    try {
        const { paperId } = req.params;
        const { type, userIdentifier } = req.body; // type: 'view', 'like', 'bookmark'

        if (!['view', 'like', 'bookmark'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid interaction type'
            });
        }

        const Paper = require('../models/Paper');
        await Paper.recordInteraction(paperId, type, userIdentifier || req.ip);

        res.json({
            success: true,
            message: 'Interaction recorded'
        });

    } catch (error) {
        console.error('Error recording interaction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record interaction'
        });
    }
});

module.exports = router;
