import { env } from '../config/env.js';

export function errorHandler(error, req, res, next) {
  console.error(`${req.method} ${req.originalUrl}`, error);

  if (error.code === 'ER_NO_SUCH_TABLE') {
    return res.status(500).json({
      success: false,
      message: 'Database table is missing. Confirm the schema was created successfully.'
    });
  }

  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate record'
    });
  }

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    stack: env.nodeEnv === 'production' ? undefined : error.stack
  });
}
