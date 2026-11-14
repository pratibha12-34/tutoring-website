const mongoose = require('mongoose');

const teacherSalaryPaymentSchema = new mongoose.Schema({
    month: {
        type: String,
        required: true,
        match: /^\d{4}-(0[1-9]|1[0-2])$/
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01
    },
    utr: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        minlength: 6,
        maxlength: 80
    },
    paidAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    paidBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Register',
        required: true
    }
}, { _id: true });

const teacherSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    subject: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    language: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
    },
    salary: {
        type: Number,
        required: true,
        min: 0
    },
    upiVpa: {
        type: String,
        trim: true,
        lowercase: true,
        select: false
    },
    salaryPayments: {
        type: [teacherSalaryPaymentSchema],
        default: [],
        select: false
    }
}, { timestamps: true });

teacherSchema.index({ 'salaryPayments.utr': 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Teacher', teacherSchema);
