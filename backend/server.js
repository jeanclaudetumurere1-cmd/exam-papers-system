const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const papersRoutes = require('./routes/papers');
const analyticsRoutes = require('./routes/analytics');
const { authenticateToken, preventCache } = require('./middleware/auth');

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:1000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/css', express.static(path.join(__dirname, '../frontend/css')));
app.use('/js', express.static(path.join(__dirname, '../frontend/js')));
app.use('/admin', express.static(path.join(__dirname, '../frontend/admin')));
app.use('/public', express.static(path.join(__dirname, '../frontend/public')));

// Apply cache prevention to admin routes
app.use('/api/papers/admin', preventCache);
app.use('/api/analytics', preventCache);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/papers', papersRoutes);
app.use('/api/analytics', analyticsRoutes);

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

const PORT = process.env.PORT || 1000;
app.listen(PORT, () => {
    console.log('\n=================================');
    console.log('🚀 NESA PORTAL SERVER STARTED');
    console.log('=================================');
    console.log(`📡 Port: ${PORT}`);
    console.log(`📍 Public: http://localhost:${PORT}/public/index.html`);
    console.log(`🔐 Admin: http://localhost:${PORT}/admin/login.html`);
    console.log(`📊 API: http://localhost:${PORT}/api/status`);
    console.log('=================================\n');
});