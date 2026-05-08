import { query } from '../config/database.js';

export async function getExamPapers(req, res) {
  const { status = 'active', year, subject, level, limit = 100, offset = 0 } = req.query;
  const filters = [];
  const params = [];

  if (status) {
    filters.push('status = ?');
    params.push(status);
  }

  if (year) {
    filters.push('year = ?');
    params.push(Number(year));
  }

  if (subject) {
    filters.push('subject LIKE ?');
    params.push(`%${subject}%`);
  }

  if (level) {
    filters.push('level = ?');
    params.push(level);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const rows = await query(
    `SELECT id, year, subject, level, category, trade_or_combination, file_path, status, created_at, updated_at
     FROM exam_papers
     ${where}
     ORDER BY year DESC, subject ASC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    params
  );

  res.json({ success: true, count: rows.length, data: rows });
}
