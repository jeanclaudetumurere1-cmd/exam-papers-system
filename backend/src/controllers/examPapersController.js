import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../../backend/uploads');

export async function getExamPapers(req, res) {
  const rows = await getExamPapersData(req.query);
  res.json({ success: true, count: rows.length, data: rows });
}

export async function getExamPapersData(options = {}) {
  const { status = 'active', year, subject, level, category, limit = 500, offset = 0 } = options;
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

  if (category) {
    filters.push('category = ?');
    params.push(category);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  let rows = await query(
    `SELECT id, year, subject, level, category, trade_or_combination, file_path, download_count, status, created_at, updated_at
     FROM exam_papers
     ${where}
     ORDER BY year DESC, subject ASC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    params
  );

  if (rows.length === 0) {
    rows = getUploadFallbackPapers({ year, subject, level, category }).slice(safeOffset, safeOffset + safeLimit);
  }

  return rows;
}

export async function downloadPaper(req, res) {
  const paperId = Number(req.params.id);
  const rows = Number.isFinite(paperId)
    ? await query('SELECT id, subject, year, level, file_path FROM exam_papers WHERE id = ?', [paperId])
    : [];

  const paper = rows[0] || getUploadFallbackPapers({}).find((item) => item.id === paperId);

  if (!paper?.file_path) {
    return res.status(404).json({ success: false, message: 'Paper not found' });
  }

  const filePath = path.resolve(uploadsDir, path.basename(paper.file_path));

  if (!filePath.startsWith(uploadsDir) || !fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Paper file not found' });
  }

  res.download(filePath);
}

function getUploadFallbackPapers(filters) {
  if (!fs.existsSync(uploadsDir)) return [];

  return fs.readdirSync(uploadsDir)
    .filter((name) => name.toLowerCase().endsWith('.pdf'))
    .map((name, index) => {
      const cleanName = name
        .replace(/^\d+-\d+_?/, '')
        .replace(/\.pdf$/i, '')
        .replace(/[_-]+/g, ' ')
        .trim();
      const yearMatch = cleanName.match(/\b(20\d{2})\b/);

      return {
        id: index + 1,
        year: yearMatch ? Number(yearMatch[1]) : new Date().getFullYear(),
        subject: cleanName || 'Exam Paper',
        level: 'A-Level',
        category: 'General',
        trade_or_combination: null,
        file_path: `uploads/${name}`,
        download_count: 0,
        status: 'active',
        created_at: null,
        updated_at: null
      };
    })
    .filter((paper) => {
      const matchesYear = !filters.year || String(paper.year) === String(filters.year);
      const matchesSubject = !filters.subject || paper.subject.toLowerCase().includes(String(filters.subject).toLowerCase());
      const matchesLevel = !filters.level || paper.level === filters.level;
      const matchesCategory = !filters.category || paper.category === filters.category;
      return matchesYear && matchesSubject && matchesLevel && matchesCategory;
    });
}
