require('dotenv').config();
const mysql = require('mysql2/promise');

const useSsl = process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production';

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'exam_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: useSsl ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined
});

// Test database connection
async function testDatabaseConnection() {
    let connection;

    try {
        connection = await pool.getConnection();
        console.log('✅ Database connected successfully');

        // Test query
        await connection.query('SELECT 1');
        console.log('✅ Database query test passed');

        return true;
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('\nTroubleshooting:');
        console.error('1. Make sure MySQL is running in XAMPP');
        console.error('2. Check if database "exam_system" exists');
        console.error('3. Verify credentials in .env file');
        console.error('4. Try: mysql -u root -p -e "CREATE DATABASE exam_system"\n');
        return false;
    } finally {
        if (connection) {
            try {
                connection.release();
            } catch (releaseError) {
                console.error('Failed to release connection:', releaseError.message);
            }
        }
    }
}

// Run test on startup
testDatabaseConnection();

// Handle connection errors
pool.on('error', (err) => {
    console.error('Database pool error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error('Database connection lost. Reconnecting...');
    }
});

module.exports = pool;
