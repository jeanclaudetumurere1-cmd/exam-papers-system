const requiredDatabaseVars = [
  'MYSQL_HOST',
  'MYSQL_PORT',
  'MYSQL_USER',
  'MYSQL_PASSWORD',
  'MYSQL_DATABASE'
];

const missingVars = requiredDatabaseVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

const corsSource = process.env.CLIENT_ORIGIN || process.env.CORS_ORIGIN || '';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret-before-deploying',
  admin: {
    username: process.env.ADMIN_USERNAME || 'Claude',
    password: process.env.ADMIN_PASSWORD || 'Umusuder01@'
  },
  corsOrigins: corsSource
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  db: {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: String(process.env.MYSQL_SSL || 'true').toLowerCase() !== 'false',
    sslCaCert: process.env.MYSQL_SSL_CA_CERT,
    sslRejectUnauthorized: String(process.env.MYSQL_SSL_REJECT_UNAUTHORIZED || 'false').toLowerCase() === 'true'
  }
};
