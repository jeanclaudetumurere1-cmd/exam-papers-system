require('dotenv').config();
const mysql = require('mysql2/promise');

console.log('\n🔍 Testing Database Connection');
console.log('================================');

const config = {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: { rejectUnauthorized: false }
};

console.log('Configuration:');
console.log(`Host: ${config.host}`);
console.log(`Port: ${config.port}`);
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
            tables.forEach(table => console.log(`  - ${Object.values(table)[0]}`));
        }

        console.log('\n✅ Test complete');
    } catch (err) {
        console.error('❌ Database test failed:', err.message);
        console.log('\nTroubleshooting:');
        console.log('1. Confirm MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE are set');
        console.log('2. Confirm the Aiven MySQL service is running');
        console.log('3. Confirm SSL is enabled for the connection');
        console.log('4. Import backend/exam_system.sql if the database is empty');
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
