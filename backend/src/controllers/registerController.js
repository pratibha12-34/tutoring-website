const bcrypt = require('bcrypt');
const { timingSafeEqual } = require('node:crypto');
const mongoose = require('mongoose');
const Register = require('../models/register');
const Course = require('../models/courses');
const { validateRegistration } = require('../schemas/registerSchema');

function matchesAdminRegistrationCode(suppliedCode, configuredCode) {
    if (typeof suppliedCode !== 'string' || !configuredCode) {
        return false;
    }

    const supplied = Buffer.from(suppliedCode);
    const configured = Buffer.from(configuredCode);
    return supplied.length === configured.length && timingSafeEqual(supplied, configured);
}

async function register(req, res) {
    const validation = validateRegistration(req.body);
    if (validation.error) {
        return res.status(400).json({ error: validation.error });
    }
    const { username, email, password, role, tuitionClass, tuitionCourseIds } = validation.value;

    if (role === 'admin') {
        const configuredCode = process.env.ADMIN_REGISTRATION_CODE;
        if (!configuredCode) {
            return res.status(503).json({ error: 'Admin registration is not configured. Contact the administrator.' });
        }
        if (!matchesAdminRegistrationCode(req.body?.adminRegistrationCode, configuredCode)) {
            return res.status(403).json({ error: 'Invalid admin registration code.' });
        }
    }

    try {
        let tuitionRequest = {};
        if (tuitionCourseIds) {
            if (new Set(tuitionCourseIds).size !== tuitionCourseIds.length
                || tuitionCourseIds.some((id) => !mongoose.isValidObjectId(id))) {
                return res.status(400).json({ error: 'Choose valid, unique courses for your tuition request.' });
            }
            const courses = await Course.find({ _id: { $in: tuitionCourseIds } }).select('_id').lean();
            if (courses.length !== tuitionCourseIds.length) {
                return res.status(400).json({ error: 'One or more selected courses are no longer available. Refresh and try again.' });
            }
            tuitionRequest = {
                tuitionClass,
                tuitionCourseIds,
                tuitionRequestStatus: 'pending'
            };
        }

        const existingUser = await Register.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(409).json({ error: 'An account with that username or email already exists.' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        await Register.create({ username, email, passwordHash, role, ...tuitionRequest });
        return res.status(201).json({
            message: tuitionCourseIds
                ? 'Account created. Your tuition request was sent to the administrator for review.'
                : 'Account created. You can now sign in.'
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'An account with that username or email already exists.' });
        }

        console.error('Failed to register user:', err);
        return res.status(500).json({ error: 'Could not create your account.' });
    }
}

module.exports = { register };
