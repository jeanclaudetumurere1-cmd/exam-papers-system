const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const papersRoutes = require('./routes/papers');
const analyticsRoutes = require('./routes/analytics');
const { authenticateToken, preventCache } = require('./middleware/auth');
const ensureSchema = require('./utils/ensureSchema');

const app = express();
app.disable('x-powered-by');

const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const frontendDir = path.join(__dirname, '../frontend');
const staticCacheOptions = {
    etag: true,
    lastModified: true,
    maxAge: process.env.STATIC_CACHE_MAX_AGE || '1d',
    dotfiles: 'deny'
};

const htmlCacheOptions = {
    etag: true,
    lastModified: true,
    maxAge: 0,
    dotfiles: 'deny',
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
};

// Middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Do not expose development/source files from the browser.
app.use(['/src', '/package.json', '/package-lock.json', '/node_modules', '/.git'], (req, res) => {
    res.status(404).send('Not found');
});

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), staticCacheOptions));
app.use('/images', express.static(path.join(frontendDir, 'images'), staticCacheOptions));
app.use('/css', express.static(path.join(frontendDir, 'css'), staticCacheOptions));
app.use('/js', express.static(path.join(frontendDir, 'js'), staticCacheOptions));
app.use('/admin/js', express.static(path.join(frontendDir, 'admin/js'), staticCacheOptions));
app.use('/admin', express.static(path.join(frontendDir, 'admin'), htmlCacheOptions));
app.use('/public/css', express.static(path.join(frontendDir, 'public/css'), staticCacheOptions));
app.use('/public/js', express.static(path.join(frontendDir, 'public/js'), staticCacheOptions));
app.use('/public', express.static(path.join(frontendDir, 'public'), htmlCacheOptions));
app.use(express.static(path.join(frontendDir, 'public'), htmlCacheOptions));

app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'online',
        uptime: process.uptime()
    });
});

// Apply cache prevention to admin routes
app.use('/api/papers/admin', preventCache);
app.use('/api/analytics', preventCache);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/papers', papersRoutes);
app.use('/api/analytics', analyticsRoutes);

app.post('/api/admin/comments/reply', authenticateToken, async (req, res) => {
    try {
        const { commentId, reply } = req.body;

        if (!commentId) {
            return res.status(400).json({
                success: false,
                message: 'Comment id is required'
            });
        }

        if (!reply || !reply.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Reply is required'
            });
        }

        const Comment = require('./models/Comment');
        const replyId = await Comment.reply(commentId, reply.trim());

        if (!replyId) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        res.json({
            success: true,
            message: 'Reply saved successfully',
            replyId
        });
    } catch (error) {
        console.error('Error replying to comment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save reply: ' + error.message
        });
    }
});

// Root route
app.get('/', (req, res) => {
    res.redirect('/public/index.html');
});

// API status
app.get('/api/status', (req, res) => {
    res.json({ 
        success: true,
        status: 'online', 
        message: 'NESA Portal API is running',
        timestamp: new Date().toISOString()
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        success: false,
        message: 'API endpoint not found' 
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ 
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 3000;
ensureSchema().catch(error => {
    console.error('Database schema check failed:', error);
}).finally(() => app.listen(PORT, () => {
    console.log('\n=================================');
    console.log('🚀 NESA PORTAL SERVER STARTED');
    console.log('=================================');
    console.log(`📡 Port: ${PORT}`);
    console.log(`📍 Public: /public/index.html`);
    console.log(`🔐 Admin: /admin/login.html`);
    console.log(`📊 API: /api/status`);
    console.log('=================================\n');
}));

