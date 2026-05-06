require('dotenv').config();
const mysql = require('mysql2/promise');

console.log('\n🔍 Testing Database Connection');
console.log('================================');

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'exam_system'
};

console.log('Configuration:');
console.log(`Host: ${config.host}`);
console.log(`User: ${config.user}`);
console.log(`Password: ${config.password ? '******' : '(empty)'}`);
console.log(`Database: ${config.database}`);
console.log('================================');

async function main() {
    let connection;

    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Connected successfully!');

        const [results] = await connection.query('SELECT 1 + 1 AS solution');
        console.log('✅ Query test passed:', results[0].solution);

        const [tables] = await connection.query('SHOW TABLES');
        console.log(`\nTables in database (${tables.length}):`);

        if (tables.length === 0) {
            console.log('  No tables found. Run setup-database.js or import the SQL file.');
        } else {
            tables.forEach(table => {
                console.log(`  - ${table.Tables_in_exam_system || Object.values(table)[0]}`);
            });
        }

        console.log('\n✅ Test complete');
    } catch (err) {
        console.error('❌ Database test failed:', err.message);
        console.log('\nTroubleshooting:');
        console.log('1. Make sure MySQL is running in XAMPP');
        console.log('2. Open XAMPP Control Panel and start MySQL');
        console.log('3. Check if password is correct (XAMPP default is empty)');
        console.log('4. Try: mysql -u root -p');
        console.log('5. Create database: CREATE DATABASE exam_system;');
        process.exit(1);
    } finally {
        if (connection) {
            try {
                await connection.end();
            } catch (endErr) {
                console.error('Error closing connection:', endErr.message);
            }
        }
    }
}

main();
