const db = require('./db');

class Paper {
    constructor(data) {
        this.id = data.id;
        this.year = data.year;
        this.subject = data.subject;
        this.level = data.level;
        this.category = data.category;
        this.trade_or_combination = data.trade_or_combination;
        this.file_path = data.file_path;
        this.status = data.status;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Get all active papers
    static async getAllActive() {
        const [rows] = await db.query(
            'SELECT * FROM exam_papers WHERE status = "active" ORDER BY year DESC, subject ASC'
        );

        return rows.map(row => new Paper(row));
    }

    // Get paper by ID
    static async getById(id) {
        const [rows] = await db.query('SELECT * FROM exam_papers WHERE id = ?', [id]);

        if (rows.length === 0) return null;

        return new Paper(rows[0]);
    }

    // Get papers by filters
    static async getFiltered(filters) {
        let query = 'SELECT * FROM exam_papers WHERE status = "active"';
        const params = [];

        if (filters.year) {
            query += ' AND year = ?';
            params.push(filters.year);
        }

        if (filters.level) {
            query += ' AND level = ?';
            params.push(filters.level);
        }

        if (filters.category) {
            query += ' AND category = ?';
            params.push(filters.category);
        }

        if (filters.subject) {
            query += ' AND subject = ?';
            params.push(filters.subject);
        }

        query += ' ORDER BY year DESC, subject ASC';

        const [rows] = await db.query(query, params);

        return rows.map(row => new Paper(row));
    }

    // Get download count for paper
    static async getDownloadCount(paperId) {
        const [rows] = await db.query(
            'SELECT COUNT(*) as count FROM downloads WHERE paper_id = ?',
            [paperId]
        );

        return rows[0].count || 0;
    }

    // Record download
    static async recordDownload(paperId) {
        await db.query('INSERT INTO downloads (paper_id) VALUES (?)', [paperId]);
    }

    // Get interaction count
    static async getInteractionCount(paperId, type) {
        const [rows] = await db.query(
            'SELECT COUNT(*) as count FROM paper_interactions WHERE paper_id = ? AND interaction_type = ?',
            [paperId, type]
        );

        return rows[0].count || 0;
    }

    // Record interaction
    static async recordInteraction(paperId, type, userIdentifier) {
        try {
            await db.query(
                'INSERT INTO paper_interactions (paper_id, interaction_type, user_identifier) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP',
                [paperId, type, userIdentifier]
            );
        } catch (error) {
            // Ignore duplicate key errors
        }
    }
}

module.exports = Paper;