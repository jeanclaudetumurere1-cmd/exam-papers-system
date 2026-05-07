const db = require('./db');

class Comment {
    constructor(data) {
        this.id = data.id;
        this.paper_id = data.paper_id;
        this.student_name = data.student_name || data.user_name || 'Student';
        this.student_email = data.student_email || data.user_email || '';
        this.comment = data.comment;
        this.rating = data.rating;
        this.likes = data.likes || 0;
        this.is_admin_comment = Boolean(data.is_admin_comment);
        this.parent_comment_id = data.parent_comment_id;
        this.admin_reply = data.admin_reply || '';
        this.replied_at = data.replied_at;
        this.paper_subject = data.paper_subject;
        this.paper_year = data.paper_year;
        this.paper_level = data.paper_level;
        this.status = data.status || 'visible';
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create a new comment
    static async create(commentData) {
        const { paper_id, student_name, student_email, comment, rating } = commentData;

        const [result] = await db.query(
            `INSERT INTO comments 
             (paper_id, student_name, student_email, user_name, user_email, comment, rating, is_admin_comment) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
            [paper_id, student_name, student_email, student_name, student_email, comment, rating]
        );

        return result.insertId;
    }

    // Get all comments for a paper
    static async getByPaperId(paperId) {
        const [rows] = await db.query(
            `SELECT c.*, p.subject AS paper_subject, p.year AS paper_year, p.level AS paper_level
             FROM comments c
             LEFT JOIN exam_papers p ON CAST(c.paper_id AS UNSIGNED) = p.id
             WHERE c.paper_id = ? AND COALESCE(c.status, 'visible') = 'visible'
             ORDER BY COALESCE(c.parent_comment_id, c.id), c.is_admin_comment ASC, c.created_at ASC`,
            [paperId]
        );

        return rows.map(row => new Comment(row));
    }

    // Get comment by ID
    static async getById(id) {
        const [rows] = await db.query('SELECT * FROM comments WHERE id = ?', [id]);

        if (rows.length === 0) return null;

        return new Comment(rows[0]);
    }

    // Update comment likes
    static async updateLikes(id, likes) {
        await db.query('UPDATE comments SET likes = ? WHERE id = ?', [likes, id]);
    }

    static async getAll() {
        const [rows] = await db.query(
            `SELECT c.*, p.subject AS paper_subject, p.year AS paper_year, p.level AS paper_level
             FROM comments c
             LEFT JOIN exam_papers p ON CAST(c.paper_id AS UNSIGNED) = p.id
             ORDER BY c.created_at DESC`
        );

        return rows.map(row => new Comment(row));
    }

    static async reply(commentId, replyText) {
        const comment = await Comment.getById(commentId);
        if (!comment) return null;

        await db.query(
            `UPDATE comments
             SET admin_reply = ?, replied_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [replyText, commentId]
        );

        const [result] = await db.query(
            `INSERT INTO comments 
             (paper_id, student_name, student_email, user_name, user_email, comment, is_admin_comment, parent_comment_id, status)
             VALUES (?, 'Admin', '', 'Admin', '', ?, 1, ?, 'visible')`,
            [comment.paper_id, replyText, commentId]
        );

        return result.insertId;
    }

    // Delete comment
    static async delete(id) {
        await db.query('DELETE FROM comments WHERE id = ?', [id]);
    }

    // Get average rating for a paper
    static async getAverageRating(paperId) {
        const [rows] = await db.query(
            `SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
             FROM comments
             WHERE paper_id = ?
               AND rating IS NOT NULL
               AND COALESCE(is_admin_comment, 0) = 0
               AND COALESCE(status, 'visible') = 'visible'`,
            [paperId]
        );

        return {
            average: rows[0].avg_rating ? parseFloat(rows[0].avg_rating).toFixed(1) : 0,
            total: rows[0].total_ratings
        };
    }
}

module.exports = Comment;
