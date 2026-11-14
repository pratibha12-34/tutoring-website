const bcrypt = require('bcrypt');
const Register = require('../models/register');
const AdminSettings = require('../models/adminSettings');

async function verifyCurrentPin(currentPin) {
    const settings = await AdminSettings.findById('admin-login').select('+pinHash');
    if (settings) {
        return bcrypt.compare(currentPin, settings.pinHash);
    }

    const initialPin = process.env.ADMIN_LOGIN_PASSWORD;
    return typeof initialPin === 'string' && currentPin === initialPin;
}

async function changeAdminPin(req, res) {
    const currentPin = typeof req.body?.currentPin === 'string' ? req.body.currentPin : '';
    const newPin = typeof req.body?.newPin === 'string' ? req.body.newPin : '';

    if (!currentPin || !/^\d{8,}$/.test(newPin)) {
        return res.status(400).json({ error: 'Enter your current PIN and a new PIN of at least 8 digits.' });
    }

    try {
        const admin = await Register.findOne({ _id: req.auth.userId, username: req.auth.username, role: 'admin' }).select('_id');
        if (!admin) {
            return res.status(401).json({ error: 'Admin account is no longer available. Sign in again.' });
        }
        if (!(await verifyCurrentPin(currentPin))) {
            return res.status(401).json({ error: 'Current PIN is incorrect. Use the admin login PIN, not the admin registration code. If you changed the PIN before, use the latest PIN.' });
        }

        const pinHash = await bcrypt.hash(newPin, 12);
        await AdminSettings.findByIdAndUpdate(
            'admin-login',
            { $set: { pinHash } },
            { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true }
        );

        return res.json({ message: 'Admin PIN changed successfully.' });
    } catch (err) {
        console.error('Failed to change admin PIN:', err);
        return res.status(500).json({ error: 'Could not change the admin PIN. Please try again.' });
    }
}

module.exports = { changeAdminPin };
