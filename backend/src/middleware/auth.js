const jwt = require('jsonwebtoken');
const Register = require('../models/register');

const VALID_ROLES = ['admin', 'student', 'teacher'];

async function authenticate(req, res, next) {
    const authorization = req.get('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token || !process.env.JWT_SECRET) {
        return res.status(401).json({ error: 'Sign in to continue.' });
    }

    let claims;
    try {
        claims = jwt.verify(token, process.env.JWT_SECRET);
        if (typeof claims.sub !== 'string' || !VALID_ROLES.includes(claims.role) || typeof claims.username !== 'string') {
            return res.status(401).json({ error: 'Your session is invalid. Sign in again.' });
        }

    } catch (error) {
        if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
            return res.status(401).json({ error: 'Your session has expired. Sign in again.' });
        }
        return next(error);
    }

    try {
        const account = await Register.findById(claims.sub).select('username role').lean();
        if (!account || account.username !== claims.username || account.role !== claims.role) {
            return res.status(401).json({ error: 'Your account has changed. Sign in again.' });
        }

        req.auth = {
            userId: claims.sub,
            username: claims.username,
            role: claims.role
        };
        return next();
    } catch (error) {
        return next(error);
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.auth || !roles.includes(req.auth.role)) {
            return res.status(403).json({ error: 'You do not have permission to perform this action.' });
        }
        return next();
    };
}

module.exports = { authenticate, requireRole };
