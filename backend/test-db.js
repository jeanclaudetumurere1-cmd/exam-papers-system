import 'dotenv/config';
import { pool, testDatabaseConnection } from './src/config/database.js';

async function main() {
  try {
    await testDatabaseConnection();

    const [tables] = await pool.query('SHOW TABLES');
    console.log(`Tables found: ${tables.length}`);
    tables.forEach((table) => console.log(`- ${Object.values(table)[0]}`));
  } catch (error) {
    console.error('Database test failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
