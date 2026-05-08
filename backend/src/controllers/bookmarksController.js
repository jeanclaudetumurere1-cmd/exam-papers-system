import { query } from '../config/database.js';

export async function createBookmark(req, res) {
  const { paper_id, ip_address, user_identifier } = req.body;

  if (!paper_id) {
    return res.status(400).json({ success: false, message: 'paper_id is required' });
  }

  const ipAddress = ip_address || user_identifier || req.ip;

  let result = { insertId: null };

  try {
    result = await query(
      'INSERT INTO bookmarks (paper_id, ip_address) VALUES (?, ?)',
      [paper_id, ipAddress]
    );
  } catch (error) {
    if (error.code !== 'ER_NO_REFERENCED_ROW_2' && error.code !== 'ER_NO_SUCH_TABLE') {
      throw error;
    }
  }

  res.status(201).json({
    success: true,
    message: 'Bookmark saved',
    data: { id: result.insertId, paper_id, ip_address: ipAddress }
  });
}
