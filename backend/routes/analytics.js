const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// GET analytics data - Protected route
router.get('/', authenticateToken, async (req, res) => {
    try {
        console.log('📊 Fetching analytics data...');
        
        // Get current date info
        const today = new Date().toISOString().split('T')[0];
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

        // Run all queries in parallel
        const [
            [totalVisitsResult],
            [todayVisitsResult],
            [monthVisitsResult],
            [totalPapersResult],
            [activePapersResult],
            [primaryPapersResult],
            [olevelPapersResult],
            [alevelPapersResult],
            [generalPapersResult],
            [tvetPapersResult],
            papersByYearResult,
            papersBySubjectResult,
            [totalDownloadsResult],
            mostDownloadedResult
        ] = await Promise.all([
            db.query('SELECT COUNT(*) as count FROM site_visits'),
            db.query('SELECT COUNT(*) as count FROM site_visits WHERE DATE(visited_at) = ?', [today]),
            db.query('SELECT COUNT(*) as count FROM site_visits WHERE visited_at >= ?', [firstDayOfMonth]),
            db.query('SELECT COUNT(*) as count FROM exam_papers'),
            db.query('SELECT COUNT(*) as count FROM exam_papers WHERE status = "active"'),
            db.query('SELECT COUNT(*) as count FROM exam_papers WHERE level = "Primary"'),
            db.query('SELECT COUNT(*) as count FROM exam_papers WHERE level = "O-Level"'),
            db.query('SELECT COUNT(*) as count FROM exam_papers WHERE level = "A-Level"'),
            db.query('SELECT COUNT(*) as count FROM exam_papers WHERE category = "General"'),
            db.query('SELECT COUNT(*) as count FROM exam_papers WHERE category = "TVET"'),
            db.query('SELECT year, COUNT(*) as count FROM exam_papers GROUP BY year ORDER BY year DESC'),
            db.query('SELECT subject, COUNT(*) as count FROM exam_papers GROUP BY subject ORDER BY count DESC LIMIT 10'),
            db.query('SELECT COUNT(*) as count FROM downloads'),
            db.query(
                `SELECT p.id, p.subject, p.year, p.level, p.category, p.trade_or_combination, COUNT(d.id) as download_count 
                 FROM exam_papers p 
                 LEFT JOIN downloads d ON p.id = d.paper_id 
                 GROUP BY p.id 
                 ORDER BY download_count DESC 
                 LIMIT 1`
            )
        ]);

        const analyticsData = {
            visitors: {
                total: totalVisitsResult[0]?.count || 0,
                today: todayVisitsResult[0]?.count || 0,
                thisMonth: monthVisitsResult[0]?.count || 0
            },
            papers: {
                total: totalPapersResult[0]?.count || 0,
                active: activePapersResult[0]?.count || 0,
                primary: primaryPapersResult[0]?.count || 0,
                olevel: olevelPapersResult[0]?.count || 0,
                alevel: alevelPapersResult[0]?.count || 0,
                general: generalPapersResult[0]?.count || 0,
                tvet: tvetPapersResult[0]?.count || 0,
                byYear: papersByYearResult[0] || [],
                bySubject: papersBySubjectResult[0] || []
            },
            downloads: {
                total: totalDownloadsResult[0]?.count || 0,
                mostDownloaded: mostDownloadedResult[0] || null
            }
        };

        console.log('✅ Analytics data fetched successfully');
        
        res.json({
            success: true,
            data: analyticsData
        });

    } catch (error) {
        console.error('❌ Analytics error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch analytics data',
            error: error.message,
            data: {
                visitors: { total: 0, today: 0, thisMonth: 0 },
                papers: { total: 0, active: 0, primary: 0, olevel: 0, alevel: 0, general: 0, tvet: 0, byYear: [], bySubject: [] },
                downloads: { total: 0, mostDownloaded: null }
            }
        });
    }
});

// Track visit - Public route
router.post('/track-visit', async (req, res) => {
    try {
        const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
        const userAgent = req.headers['user-agent'] || 'Unknown';

        await db.query(
            'INSERT INTO site_visits (ip_address, user_agent) VALUES (?, ?)',
            [ip, userAgent]
        );

        res.json({ 
            success: true,
            message: 'Visit tracked' 
        });

    } catch (error) {
        console.error('Error tracking visit:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to track visit' 
        });
    }
});

// Track download - Public route
router.post('/track-download', async (req, res) => {
    try {
        const { paperId } = req.body;

        if (!paperId) {
            return res.status(400).json({ 
                success: false,
                message: 'Paper ID is required' 
            });
        }

        await db.query(
            'INSERT INTO downloads (paper_id) VALUES (?)',
            [paperId]
        );

        res.json({ 
            success: true,
            message: 'Download tracked' 
        });

    } catch (error) {
        console.error('Error tracking download:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to track download' 
        });
    }
});

module.exports = router;