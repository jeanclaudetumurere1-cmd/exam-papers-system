const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Claude';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Umusuder01@';
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-before-deploying';

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Username and password are required' 
            });
        }

        // Check credentials
        if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials' 
            });
        }

        // Create token
        const token = jwt.sign(
            { username, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({ 
            success: true,
            message: 'Login successful' 
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error during login' 
        });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ 
        success: true,
        message: 'Logged out successfully' 
    });
});

router.get('/verify', (req, res) => {
    const token = req.cookies.token;
    
    if (!token) {
        return res.status(401).json({ 
            success: false,
            valid: false 
        });
    }

    try {
        jwt.verify(token, JWT_SECRET);
        res.json({ 
            success: true,
            valid: true 
        });
    } catch (error) {
        res.status(401).json({ 
            success: false,
            valid: false 
        });
    }
});

module.exports = router;
