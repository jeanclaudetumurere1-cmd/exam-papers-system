import { query } from '../config/database.js';

export async function createBookmark(req, res) {
  const { paper_id, ip_address, user_identifier } = req.body;

  if (!paper_id) {
    return res.status(400).json({ success: false, message: 'paper_id is required' });
  }

  const ipAddress = ip_address || user_identifier || req.ip;

  const result = await query(
    'INSERT INTO bookmarks (paper_id, ip_address) VALUES (?, ?)',
    [paper_id, ipAddress]
  );

  res.status(201).json({
    success: true,
    message: 'Bookmark saved',
    data: { id: result.insertId, paper_id, ip_address: ipAddress }
  });
}
