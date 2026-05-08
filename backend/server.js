import 'dotenv/config';
import app from './src/app.js';
import { env } from './src/config/env.js';
import { testDatabaseConnection } from './src/config/database.js';
import { initializeDatabase } from './src/config/schema.js';

async function startServer() {
  try {
    await testDatabaseConnection();
    await initializeDatabase();

    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
      console.log(`Environment: ${env.nodeEnv}`);
      console.log('Database: Aiven MySQL connected with SSL');
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
