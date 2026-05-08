require('dotenv').config();
const mysql = require('mysql2/promise');

const requiredEnvVars = [
    'MYSQL_HOST',
    'MYSQL_PORT',
    'MYSQL_USER',
    'MYSQL_PASSWORD',
    'MYSQL_DATABASE'
];

if (process.env.NODE_ENV === 'production') {
    const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);

    if (missingEnvVars.length) {
        throw new Error(`Missing required database environment variables: ${missingEnvVars.join(', ')}`);
    }
}

// Create connection pool
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: { rejectUnauthorized: false }
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
        console.error('1. Confirm the MYSQL_* environment variables are set');
        console.error('2. Confirm the Aiven host, port, user, password, and database are correct');
        console.error('3. Confirm Aiven MySQL allows SSL connections');
        console.error('4. Import the schema if the database is empty\n');
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
