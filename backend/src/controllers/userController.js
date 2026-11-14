const bcrypt = require('bcrypt');
const { timingSafeEqual } = require('node:crypto');
const jwt = require('jsonwebtoken');
const Register = require('../models/register');
const AdminSettings = require('../models/adminSettings');

function matchesAdminPassword(suppliedPassword, configuredPassword) {
    if (!configuredPassword) {
        return false;
    }

    const supplied = Buffer.from(suppliedPassword);
    const configured = Buffer.from(configuredPassword);
    return supplied.length === configured.length && timingSafeEqual(supplied, configured);
}

async function login(req, res) {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const requestedRole = typeof req.body?.role === 'string' ? req.body.role : '';

    if (!username || !password || !['admin', 'teacher', 'student'].includes(requestedRole)) {
        return res.status(400).json({ error: 'Enter your username, password or PIN, and select a valid role.' });
    }

    try {
        const user = await Register.findOne({ username }).select('+passwordHash');
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }
        if (user.role !== requestedRole) {
            return res.status(403).json({ error: `This account is registered as ${user.role}. Select that role to sign in.` });
        }
        if (user.role === 'admin') {
            const adminSettings = await AdminSettings.findById('admin-login').select('+pinHash');
            const isValidAdminPin = adminSettings
                ? await bcrypt.compare(password, adminSettings.pinHash)
                : matchesAdminPassword(password, process.env.ADMIN_LOGIN_PASSWORD);

            if (!isValidAdminPin) {
                if (!adminSettings && !process.env.ADMIN_LOGIN_PASSWORD) {
                    return res.status(503).json({ error: 'Admin login is not configured. Contact the administrator.' });
                }
                return res.status(401).json({ error: 'Invalid username or password.' });
            }
        } else if (!(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(503).json({ error: 'Authentication is not configured. Contact the administrator.' });
        }

        const token = jwt.sign(
            { role: user.role, username: user.username },
            process.env.JWT_SECRET,
            { subject: user._id.toString(), expiresIn: '8h' }
        );

        return res.json({
            token,
            user: {
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Failed to log in user:', err);
        return res.status(500).json({ error: 'Could not log in. Please try again.' });
    }
}

module.exports = { login };
