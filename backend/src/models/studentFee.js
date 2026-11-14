const mongoose = require('mongoose');

const studentFeePaymentSchema = new mongoose.Schema({
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
    status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending',
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    reviewedAt: {
        type: Date,
        default: null
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Register',
        default: null
    }
}, { _id: true });

const studentFeeSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Register',
        required: true,
        unique: true
    },
    totalFee: {
        type: Number,
        required: true,
        min: 0
    },
    paidAmount: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    payments: {
        type: [studentFeePaymentSchema],
        default: []
    }
}, { timestamps: true });

studentFeeSchema.index({ 'payments.utr': 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('StudentFee', studentFeeSchema);
