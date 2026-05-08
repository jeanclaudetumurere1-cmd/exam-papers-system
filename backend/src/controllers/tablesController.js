import { query } from '../config/database.js';

export async function getTables(req, res) {
  const tables = await query('SHOW TABLES');
  res.json({
    success: true,
    data: tables.map((table) => Object.values(table)[0])
  });
}
