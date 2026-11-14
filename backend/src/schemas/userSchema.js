const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 32
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    passwordHash: {
        type: String,
        required: true,
        select: false
    },
    role: {
        type: String,
        enum: ['student', 'teacher', 'admin'],
        required: true
    },
    tuitionClass: {
        type: String,
        trim: true,
        maxlength: 80,
        default: ''
    },
    tuitionCourseIds: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course'
        }],
        default: []
    },
    tuitionRequestStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', null],
        default: null
    },
    tuitionReviewedAt: {
        type: Date,
        default: null
    },
    tuitionReviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Register',
        default: null
    }
}, { timestamps: true });

module.exports = userSchema;
