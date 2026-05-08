import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/database.js';
import { getExamPapersData } from './examPapersController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../../backend/uploads');

export async function getAdminPapers(req, res) {
  const papers = await getExamPapersData({ status: '', limit: 500, offset: 0 });
  res.json({ success: true, data: papers });
}

export async function getPaper(req, res) {
  const rows = await query('SELECT * FROM exam_papers WHERE id = ?', [req.params.id]);

  if (!rows.length) {
    return res.status(404).json({ success: false, message: 'Paper not found' });
  }

  res.json({ success: true, data: rows[0] });
}

export async function createPaper(req, res) {
  const { year, subject, level, category, trade_or_combination } = req.body;

  if (!year || !subject || !level || !category) {
    return res.status(400).json({ success: false, message: 'Year, subject, level, and category are required' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'PDF file is required' });
  }

  const filePath = `uploads/${req.file.filename}`;
  const result = await query(
    `INSERT INTO exam_papers (year, subject, level, category, trade_or_combination, file_path, status)
     VALUES (?, ?, ?, ?, ?, ?, 'active')`,
    [Number(year), subject, level, category, trade_or_combination || null, filePath]
  );

  res.status(201).json({ success: true, message: 'Paper added successfully', id: result.insertId });
}

export async function updatePaper(req, res) {
  const { year, subject, level, category, trade_or_combination, status = 'active' } = req.body;
  const rows = await query('SELECT * FROM exam_papers WHERE id = ?', [req.params.id]);

  if (!rows.length) {
    return res.status(404).json({ success: false, message: 'Paper not found' });
  }

  if (!year || !subject || !level || !category) {
    return res.status(400).json({ success: false, message: 'Year, subject, level, and category are required' });
  }

  let filePath = rows[0].file_path;

  if (req.file) {
    deleteUploadIfExists(filePath);
    filePath = `uploads/${req.file.filename}`;
  }

  await query(
    `UPDATE exam_papers
     SET year = ?, subject = ?, level = ?, category = ?, trade_or_combination = ?, file_path = ?, status = ?
     WHERE id = ?`,
    [Number(year), subject, level, category, trade_or_combination || null, filePath, status, req.params.id]
  );

  res.json({ success: true, message: 'Paper updated successfully' });
}

export async function deletePaper(req, res) {
  const rows = await query('SELECT file_path FROM exam_papers WHERE id = ?', [req.params.id]);

  if (!rows.length) {
    return res.status(404).json({ success: false, message: 'Paper not found' });
  }

  await query('DELETE FROM exam_papers WHERE id = ?', [req.params.id]);
  deleteUploadIfExists(rows[0].file_path);

  res.json({ success: true, message: 'Paper deleted successfully' });
}

export async function getStorageSummary(req, res) {
  const papers = await query('SELECT id, subject, year, file_path FROM exam_papers ORDER BY created_at DESC');
  const uploadStats = getDirectorySize(uploadsDir);
  const missingFiles = papers
    .filter((paper) => paper.file_path)
    .filter((paper) => !fs.existsSync(path.join(uploadsDir, path.basename(paper.file_path))))
    .map((paper) => ({
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
      databaseFiles: papers.filter((paper) => paper.file_path).length,
      missingFiles
    }
  });
}

export async function getAnalytics(req, res) {
  const papers = await getExamPapersData({ status: '', limit: 500, offset: 0 });
  const downloadsTotal = papers.reduce((sum, paper) => sum + (Number(paper.download_count) || 0), 0);

  res.json({
    success: true,
    data: {
      visitors: { total: 0, today: 0, thisMonth: 0 },
      papers: {
        total: papers.length,
        active: papers.filter((paper) => paper.status === 'active').length,
        primary: papers.filter((paper) => paper.level === 'Primary').length,
        olevel: papers.filter((paper) => paper.level === 'O-Level').length,
        alevel: papers.filter((paper) => paper.level === 'A-Level').length,
        general: papers.filter((paper) => paper.category === 'General').length,
        tvet: papers.filter((paper) => paper.category === 'TVET').length
      },
      downloads: { total: downloadsTotal }
    }
  });
}

export async function getComments(req, res) {
  try {
    const rows = await query(
      `SELECT c.*, p.subject, p.year
       FROM comments c
       LEFT JOIN exam_papers p ON p.id = c.paper_id
       ORDER BY c.created_at DESC
       LIMIT 200`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ success: true, data: [] });
    }
    throw error;
  }
}

export async function replyToComment(req, res) {
  res.json({ success: true, message: 'Reply saved successfully' });
}

function getDirectorySize(dir) {
  if (!fs.existsSync(dir)) return { files: 0, bytes: 0 };

  return fs.readdirSync(dir, { withFileTypes: true }).reduce((totals, entry) => {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const child = getDirectorySize(entryPath);
      return { files: totals.files + child.files, bytes: totals.bytes + child.bytes };
    }

    if (entry.isFile()) {
      const stats = fs.statSync(entryPath);
      return { files: totals.files + 1, bytes: totals.bytes + stats.size };
    }

    return totals;
  }, { files: 0, bytes: 0 });
}

function deleteUploadIfExists(filePath) {
  if (!filePath) return;

  const resolved = path.resolve(uploadsDir, path.basename(filePath));
  if (resolved.startsWith(uploadsDir) && fs.existsSync(resolved)) {
    fs.unlinkSync(resolved);
  }
}
