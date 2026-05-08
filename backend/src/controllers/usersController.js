import { query } from '../config/database.js';

export async function getUsers(req, res) {
  const rows = await query(
    'SELECT id, full_name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 200'
  );

  res.json({ success: true, count: rows.length, data: rows });
}
