const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../../config/database');
const { authenticateToken } = require('../../middleware/auth');
const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
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

// GET all papers
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM exam_papers ORDER BY created_at DESC'
        );
        
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error fetching papers:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch papers',
            data: []
        });
    }
});

// GET single paper
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

        if (category === 'TVET' && !trade_or_combination) {
            return res.status(400).json({ 
                success: false,
                message: 'Trade is required for TVET papers' 
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

        const [existing] = await db.query(
            'SELECT file_path FROM exam_papers WHERE id = ?', 
            [id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Paper not found' 
            });
        }

        let file_path = existing[0].file_path;

        if (req.file) {
            const oldFilePath = path.join(__dirname, '../../', existing[0].file_path);
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
        
        const filePath = path.join(__dirname, '../../', rows[0].file_path);
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

module.exports = router;