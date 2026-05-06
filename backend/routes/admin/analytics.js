const express = require('express');
const db = require('../../config/database');
const { authenticateToken } = require('../../middleware/auth');
const router = express.Router();

// GET analytics data
router.get('/', authenticateToken, async (req, res) => {
    try {
        console.log('Fetching analytics data...');
        
        const today = new Date().toISOString().split('T')[0];
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

        // Run queries
        const [totalVisits] = await db.query('SELECT COUNT(*) as count FROM site_visits');
        const [todayVisits] = await db.query('SELECT COUNT(*) as count FROM site_visits WHERE DATE(visited_at) = ?', [today]);
        const [monthVisits] = await db.query('SELECT COUNT(*) as count FROM site_visits WHERE visited_at >= ?', [firstDayOfMonth]);
        const [totalPapers] = await db.query('SELECT COUNT(*) as count FROM exam_papers');
        const [activePapers] = await db.query('SELECT COUNT(*) as count FROM exam_papers WHERE status = "active"');
        const [generalPapers] = await db.query('SELECT COUNT(*) as count FROM exam_papers WHERE category = "General"');
        const [tvetPapers] = await db.query('SELECT COUNT(*) as count FROM exam_papers WHERE category = "TVET"');
        const [olevelPapers] = await db.query('SELECT COUNT(*) as count FROM exam_papers WHERE level = "O-Level"');
        const [alevelPapers] = await db.query('SELECT COUNT(*) as count FROM exam_papers WHERE level = "A-Level"');
        const [papersByYear] = await db.query('SELECT year, COUNT(*) as count FROM exam_papers GROUP BY year ORDER BY year DESC');
        const [papersBySubject] = await db.query('SELECT subject, COUNT(*) as count FROM exam_papers GROUP BY subject ORDER BY count DESC LIMIT 10');
        const [totalDownloads] = await db.query('SELECT COUNT(*) as count FROM downloads');
        const [mostDownloaded] = await db.query(
            `SELECT p.id, p.subject, p.year, p.level, p.category, p.trade_or_combination, COUNT(d.id) as download_count 
             FROM exam_papers p 
             LEFT JOIN downloads d ON p.id = d.paper_id 
             GROUP BY p.id 
             ORDER BY download_count DESC 
             LIMIT 1`
        );

        const analyticsData = {
            visitors: {
                total: totalVisits[0]?.count || 0,
                today: todayVisits[0]?.count || 0,
                thisMonth: monthVisits[0]?.count || 0
            },
            papers: {
                total: totalPapers[0]?.count || 0,
                active: activePapers[0]?.count || 0,
                general: generalPapers[0]?.count || 0,
                tvet: tvetPapers[0]?.count || 0,
                olevel: olevelPapers[0]?.count || 0,
                alevel: alevelPapers[0]?.count || 0,
                byYear: papersByYear[0] || [],
                bySubject: papersBySubject[0] || []
            },
            downloads: {
                total: totalDownloads[0]?.count || 0,
                mostDownloaded: mostDownloaded[0] || null
            }
        };

        res.json({
            success: true,
            data: analyticsData
        });

    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch analytics data',
            data: {
                visitors: { total: 0, today: 0, thisMonth: 0 },
                papers: { total: 0, active: 0, general: 0, tvet: 0, olevel: 0, alevel: 0, byYear: [], bySubject: [] },
                downloads: { total: 0, mostDownloaded: null }
            }
        });
    }
});

module.exports = router;