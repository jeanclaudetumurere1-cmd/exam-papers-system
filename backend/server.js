import 'dotenv/config';
import app from './src/app.js';
import { env } from './src/config/env.js';
import { setDatabaseReady, testDatabaseConnection } from './src/config/database.js';
import { initializeDatabase } from './src/config/schema.js';

function startServer() {
  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
    console.log(`Environment: ${env.nodeEnv}`);
    warmDatabase();
  });
}

async function warmDatabase() {
  try {
    await testDatabaseConnection();
    await initializeDatabase();
    setDatabaseReady(true);
    console.log('Database: Aiven MySQL connected with SSL');
  } catch (error) {
    setDatabaseReady(false);
    console.error('Database warm-up failed:', error.message);
  }
}

startServer();
