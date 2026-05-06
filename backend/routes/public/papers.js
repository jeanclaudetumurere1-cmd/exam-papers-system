const express = require('express');
const db = require('../../config/database');
const router = express.Router();

// GET all active papers for public
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, year, subject, level, category, trade_or_combination, file_path, created_at 
             FROM exam_papers 
             WHERE status = "active" 
             ORDER BY year DESC, subject ASC`
        );
        
        console.log(`Found ${rows.length} active papers`);
        
        const papersWithStats = await Promise.all(rows.map(async (paper) => {
            const [downloads] = await db.query(
                'SELECT COUNT(*) as count FROM downloads WHERE paper_id = ?',
                [paper.id]
            );
            return {
                ...paper,
                download_count: downloads[0]?.count || 0,
                file_url: `/${paper.file_path.replace(/\\/g, '/')}`
            };
        }));
        
        res.json({
            success: true,
            data: papersWithStats
        });
    } catch (error) {
        console.error('Error fetching public papers:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch papers',
            data: []
        });
    }
});

// GET papers by category (General or TVET)
router.get('/category/:category', async (req, res) => {
    try {
        const category = req.params.category;
        console.log(`Fetching papers for category: ${category}`);
        
        const [rows] = await db.query(
            `SELECT id, year, subject, level, category, trade_or_combination, file_path, created_at 
             FROM exam_papers 
             WHERE status = "active" AND category = ?
             ORDER BY year DESC, subject ASC`,
            [category]
        );
        
        console.log(`Found ${rows.length} papers in category: ${category}`);
        
        res.json({
            success: true,
            data: rows,
            category: category
        });
    } catch (error) {
        console.error('Error fetching papers by category:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch papers',
            data: []
        });
    }
});

// GET papers by level (O-Level or A-Level)
router.get('/level/:level', async (req, res) => {
    try {
        const level = req.params.level;
        console.log(`Fetching papers for level: ${level}`);
        
        const [rows] = await db.query(
            `SELECT id, year, subject, level, category, trade_or_combination, file_path, created_at 
             FROM exam_papers 
             WHERE status = "active" AND level = ?
             ORDER BY year DESC, subject ASC`,
            [level]
        );
        
        console.log(`Found ${rows.length} papers in level: ${level}`);
        
        res.json({
            success: true,
            data: rows,
            level: level
        });
    } catch (error) {
        console.error('Error fetching papers by level:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch papers',
            data: []
        });
    }
});

module.exports = router;