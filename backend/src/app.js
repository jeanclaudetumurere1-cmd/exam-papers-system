import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { env } from './config/env.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const frontendDir = path.join(projectRoot, 'frontend');
const backendDir = path.join(projectRoot, 'backend');

app.disable('x-powered-by');
app.set('trust proxy', 1);

const allowedOrigins = env.corsOrigins;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameSrc: ["'self'"]
    }
  }
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

const staticOptions = {
  etag: true,
  lastModified: true,
  maxAge: env.nodeEnv === 'production' ? '1h' : 0,
  dotfiles: 'deny'
};

app.use('/uploads', express.static(path.join(backendDir, 'uploads'), staticOptions));
app.use('/images', express.static(path.join(frontendDir, 'images'), staticOptions));
app.use('/css', express.static(path.join(frontendDir, 'css'), staticOptions));
app.use('/js', express.static(path.join(frontendDir, 'js'), staticOptions));
app.use('/admin', express.static(path.join(frontendDir, 'admin'), staticOptions));
app.use('/public', express.static(path.join(frontendDir, 'public'), staticOptions));

app.get('/', (req, res) => {
  res.redirect('/public/index.html');
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.use('/', routes);
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
