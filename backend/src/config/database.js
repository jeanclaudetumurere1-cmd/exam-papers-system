import mysql from 'mysql2/promise';
import { env } from './env.js';

function getSslConfig() {
  if (!env.db.ssl) return undefined;

  if (env.db.sslCaCert) {
    return {
      ca: env.db.sslCaCert.replace(/\\n/g, '\n'),
      rejectUnauthorized: true
    };
  }

  return {
    rejectUnauthorized: env.db.sslRejectUnauthorized
  };
}

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ssl: getSslConfig()
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function testDatabaseConnection() {
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.ping();
    const [result] = await connection.query('SELECT DATABASE() AS database_name, VERSION() AS mysql_version');
    console.log(`Connected to MySQL database "${result[0].database_name}"`);
    console.log(`MySQL version: ${result[0].mysql_version}`);
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}
