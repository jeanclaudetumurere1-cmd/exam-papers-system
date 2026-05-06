const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;
    
    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: 'Access denied. No token provided.' 
        });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(403).json({ 
            success: false,
            message: 'Invalid or expired token' 
        });
    }
};

const preventCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
};

module.exports = { authenticateToken, preventCache };